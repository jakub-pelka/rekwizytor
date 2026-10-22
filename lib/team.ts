import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { TheatreRole } from '@/lib/access'
import { decryptCode, encryptCode, expiryFromNow, formatCode, generateCode, INVITE_SECRET_ERROR, macCode, MAX_ATTEMPTS } from '@/lib/invite-code'

// Zespół teatru (migracje 20261012_theatre_audit i 20261018_team_managers). Odczyt ekranu zespołu
// oraz wspólna logika zaproszenia, z której korzystają kierownik (app/actions/team.ts) i superadmin (app/actions/theatres.ts).

export type { TheatreRole }

export const ROLE_LABELS: Record<TheatreRole, string> = {
    admin: 'Kierownik pracowni',
    member: 'Rekwizytor',
    viewer: 'Podgląd',
}

export type TeamPerson = {
    userId: string
    fullName: string | null
    email: string
    role: TheatreRole
    pending: boolean
    invitedAt: string | null
    joinedAt: string | null
    lastSignInAt: string | null
    isMe: boolean
    /** Kod zaproszenia osoby oczekującej; tylko dla kierownika (canManage), inaczej null. */
    invite: TeamInvite | null
}

export type TeamInvite = { state: 'waiting' | 'locked' | 'expired'; expiresAt: string; lockedAt: string | null; attemptsLeft: number }

export type TeamEvent = { at: string; text: string; actorName: string | null }

export type TeamData = {
    theatreId: string
    theatreName: string
    me: { userId: string; role: TheatreRole; canManage: boolean }
    people: TeamPerson[]
    events: TeamEvent[]
}

// Funkcje i kolumny z migracji 20261018 nie mają jeszcze (albo mają tylko częściowo) typów w types/supabase.ts,
// więc tu, w jednym miejscu, używamy klienta bez typów bazy.
export type LooseClient = SupabaseClient
export const loose = (c: unknown) => c as LooseClient

type TeamRow = {
    user_id: string
    full_name: string | null
    email: string
    role: TheatreRole
    invited_at: string | null
    joined_at: string | null
    invited_by_name: string | null
    last_sign_in_at: string | null
}

type EventRow = {
    created_at: string
    action: string
    role: string | null
    previous_role: string | null
    user_email: string | null
    user_name: string | null
    actor_email: string | null
    actor_name: string | null
}

type InviteRow = { user_id: string; expires_at: string; attempts: number; locked_at: string | null }

function inviteState(r: Pick<InviteRow, 'expires_at' | 'attempts' | 'locked_at'>): TeamInvite {
    const state = r.locked_at ? 'locked' : new Date(r.expires_at).getTime() <= Date.now() ? 'expired' : 'waiting'
    return {
        state,
        expiresAt: r.expires_at,
        lockedAt: r.locked_at,
        attemptsLeft: state === 'locked' ? 0 : Math.max(0, MAX_ATTEMPTS - r.attempts),
    }
}

const roleLabel = (r: string | null) => (r && ROLE_LABELS[r as TheatreRole]) || r || 'brak roli'

/**
 * Zdania dziennika: konstrukcja bez czasownika rodzajowego, „Kto · rzeczownik: kogo, szczegóły”.
 * Nie zgadujemy płci z imienia. Zdanie zawiera też wykonawcę, więc wiersz czyta się samodzielnie.
 */
export function describeEvent(e: EventRow): TeamEvent {
    const actor = e.actor_name?.trim() || e.actor_email || null
    const who = actor ?? 'System'
    const subject = e.user_name?.trim() || e.user_email || 'osoba usunięta'
    let text: string
    switch (e.action) {
        case 'added':
            text = `${who} · zaproszenie: ${e.user_email || subject} jako ${roleLabel(e.role)}`
            break
        case 'role_changed':
            text = `${who} · zmiana roli: ${subject}, ${roleLabel(e.previous_role)} › ${roleLabel(e.role)}`
            break
        case 'joined':
            text = `${subject} · dołączenie z zaproszenia`
            break
        case 'removed':
            text = `${who} · usunięcie z zespołu: ${subject}`
            break
        case 'migrated':
            text = `${subject} · w zespole jako ${roleLabel(e.role)} (stan sprzed dziennika)`
            break
        default:
            text = `${who} · ${e.action}: ${subject}`
    }
    return { at: e.created_at, text, actorName: e.action === 'joined' ? subject : actor }
}

export async function loadTeam(): Promise<TeamData | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const db = loose(supabase)
    const [{ data: theatreId }, { data: profile }] = await Promise.all([
        db.rpc('active_theatre_id'),
        db.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
    ])
    if (!theatreId) return null
    const isSuperadmin = profile?.role === 'admin' && profile?.status === 'approved'

    const [{ data: theatre }, { data: rows, error }, { data: membership }] = await Promise.all([
        db.from('theatres').select('name').eq('id', theatreId).maybeSingle(),
        db.rpc('theatre_team', { t: theatreId }),
        db.from('theatre_members').select('role').eq('theatre_id', theatreId).eq('user_id', user.id).maybeSingle(),
    ])
    if (error) console.error('loadTeam theatre_team:', error)

    const myRole = ((membership?.role as TheatreRole | undefined) ?? (isSuperadmin ? 'admin' : 'viewer'))
    const canManage = isSuperadmin || myRole === 'admin'

    const people: TeamPerson[] = ((rows ?? []) as TeamRow[]).map((r) => ({
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        role: r.role,
        pending: r.joined_at === null,
        invitedAt: r.invited_at,
        joinedAt: r.joined_at,
        lastSignInAt: r.last_sign_in_at,
        isMe: r.user_id === user.id,
        invite: null,
    }))

    if (canManage) {
        const pendingIds = people.filter((p) => p.pending).map((p) => p.userId)
        if (pendingIds.length) {
            // Tabela theatre_invites jest dostępna tylko dla klucza serwisowego; uprawnienie sprawdziliśmy wyżej.
            const { data: inv, error: invError } = await loose(createAdminClient()).from('theatre_invites')
                .select('user_id, expires_at, attempts, locked_at').eq('theatre_id', theatreId).in('user_id', pendingIds)
            if (invError) console.error('loadTeam invites:', invError)
            const byUser = new Map(((inv ?? []) as InviteRow[]).map((i) => [i.user_id, i]))
            for (const p of people) {
                if (!p.pending) continue
                const row = byUser.get(p.userId)
                // Zaproszenie sprzed kodów nie ma wiersza: pokazujemy je jak wygasłe, kierownik może wygenerować nowy kod.
                p.invite = row ? inviteState(row) : { state: 'expired', expiresAt: p.invitedAt ?? new Date().toISOString(), lockedAt: null, attemptsLeft: 0 }
            }
        }
    }

    let events: TeamEvent[] = []
    if (canManage) {
        const { data: log, error: logError } = await db.from('theatre_member_events')
            .select('created_at, action, role, previous_role, user_email, user_name, actor_email, actor_name')
            .eq('theatre_id', theatreId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50)
        if (logError) console.error('loadTeam events:', logError)
        events = ((log ?? []) as EventRow[]).map(describeEvent)
    }

    return {
        theatreId: theatreId as string,
        theatreName: theatre?.name ?? '',
        me: { userId: user.id, role: myRole, canManage },
        people,
        events,
    }
}

// ---------------------------------------------------------------------------------------------
// Zaproszenie (wspólne dla kierownika i superadmina)
// ---------------------------------------------------------------------------------------------

export const INVITE_FAILED = 'Nie udało się wysłać zaproszenia. Sprawdź adres i spróbuj jeszcze raz.'
export const EMAIL_INVALID = 'Wpisz poprawny adres e-mail, np. anna@teatr.pl.'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Adres aplikacji z nagłówków żądania (za proxy: x-forwarded-host), a w razie braku z NEXT_PUBLIC_SITE_URL. */
export async function appOrigin(): Promise<string> {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
        const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
        return `${proto}://${host}`
    }
    return (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
}

/**
 * Wysyła mail zaproszenia (szablon Supabase „Invite user”). Dane trafiają do szablonu jako {{ .Data.* }}.
 * Bez redirectTo z tokenem: wejście odbywa się kodem na /pl/witaj?email=… (witaj_url), a token z maila nie jest używany.
 * Zwraca id konta albo błąd Supabase (kod email_exists, gdy konto już jest i potwierdziło e-mail).
 */
export async function sendInviteMail(params: {
    email: string
    inviterName: string
    theatreName: string
    role: TheatreRole
}) {
    const admin = createAdminClient()
    const origin = await appOrigin()
    return admin.auth.admin.inviteUserByEmail(params.email, {
        data: {
            inviter_name: params.inviterName,
            theatre_name: params.theatreName,
            role_label: ROLE_LABELS[params.role],
            witaj_url: `${origin}/pl/witaj?email=${encodeURIComponent(params.email)}`,
        },
    })
}

/** Imię zapraszającego do maila: full_name z profilu albo e-mail. */
export async function inviterDisplayName(supabase: SupabaseClient, userId: string, fallbackEmail: string | undefined): Promise<string> {
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle()
    return data?.full_name?.trim() || data?.email || fallbackEmail || 'Kierownik pracowni'
}

/** Czy błąd inviteUserByEmail oznacza, że konto już istnieje (potwierdzone), więc zaproszenie nie ma sensu. */
export function isAlreadyRegistered(err: { code?: string; message?: string; status?: number } | null): boolean {
    if (!err) return false
    return err.code === 'email_exists' || err.code === 'user_already_exists' || /already (been )?registered|already exists/i.test(err.message ?? '')
}

/**
 * Czy osoba ma już działające konto (ustawiła hasło i imię). Konto bez żadnego członkostwa uznajemy za działające
 * (stare konta sprzed teatrów); konto, którego wszystkie członkostwa czekają (joined_at NULL), to zaproszenie bez przyjęcia.
 */
export async function accountIsActive(userId: string): Promise<boolean> {
    const { data } = await loose(createAdminClient()).from('theatre_members').select('joined_at').eq('user_id', userId)
    const rows = (data ?? []) as { joined_at: string | null }[]
    return rows.length === 0 || rows.some((r) => r.joined_at !== null)
}

// ---------------------------------------------------------------------------------------------
// Kod zaproszenia: zapis i odczyt (klucz serwisowy)
// ---------------------------------------------------------------------------------------------

/** Komunikat dla UI, gdy brakuje sekretu albo zapis kodu się nie udał; szczegóły idą do console.error. */
export const CODE_FAILED = 'Nie udało się przygotować kodu zaproszenia. Spróbuj jeszcze raz.'

/** Zapisuje nowy kod (nowe 7 dni, zerowy licznik, bez blokady). Wiersz zakłada, gdy go nie ma. Zwraca kod jawny i ważność. */
export async function saveInviteCode(theatreId: string, userId: string, createdBy: string): Promise<{ code: string; expiresAt: string }> {
    const code = generateCode()
    const expiresAt = expiryFromNow()
    const fields = {
        code_enc: encryptCode(code),
        code_mac: macCode(theatreId, userId, code),
        expires_at: expiresAt,
        attempts: 0,
        locked_at: null,
    }
    const db = loose(createAdminClient())
    const { data: existing } = await db.from('theatre_invites').select('user_id').eq('theatre_id', theatreId).eq('user_id', userId).maybeSingle()
    const { error } = existing
        ? await db.from('theatre_invites').update(fields).eq('theatre_id', theatreId).eq('user_id', userId)
        : await db.from('theatre_invites').insert({ theatre_id: theatreId, user_id: userId, created_by: createdBy, ...fields })
    if (error) throw new Error(`theatre_invites: ${error.message}`)
    return { code, expiresAt }
}

/** Odczyt jawnego kodu do podglądu. null, gdy kod nie jest aktywny (brak, wygasł, zablokowany). */
export async function readActiveInviteCode(theatreId: string, userId: string): Promise<{ code: string; expiresAt: string; sentAt: string } | null> {
    const { data } = await loose(createAdminClient()).from('theatre_invites')
        .select('code_enc, expires_at, locked_at, created_at').eq('theatre_id', theatreId).eq('user_id', userId).maybeSingle()
    const row = data as { code_enc: string; expires_at: string; locked_at: string | null; created_at: string } | null
    if (!row || row.locked_at || new Date(row.expires_at).getTime() <= Date.now()) return null
    return { code: decryptCode(row.code_enc), expiresAt: row.expires_at, sentAt: row.created_at }
}

export type InviteOutcome = { invited: boolean; code: string | null; expiresAt: string | null }

/**
 * Dodanie osoby do teatru (kierownik albo superadmin). Konto aktywne: członkostwo od razu, bez maila i kodu.
 * W pozostałych przypadkach: mail zaproszenia (nowe konto), członkostwo oczekujące i kod w theatre_invites.
 * Kolejność wynika z kluczy: konto (potrzebne id) → członkostwo → wiersz kodu (klucz obcy do członkostwa).
 * Gdy mail poszedł, a kodu albo członkostwa zapisać się nie udało, cofamy członkostwo i konto utworzone w tym wywołaniu.
 */
export async function addMemberWithInvite(p: {
    supabase: SupabaseClient
    inviter: { id: string; email?: string }
    theatreId: string
    email: string
    role: TheatreRole
    failIfMember?: boolean
    memberError: string
}): Promise<{ ok: true; data: InviteOutcome } | { ok: false; error: string }> {
    const admin = createAdminClient()
    const { data: existing } = await admin.from('profiles').select('id, status, current_theatre_id').ilike('email', p.email).maybeSingle()

    if (existing && p.failIfMember) {
        const { data: already } = await p.supabase.from('theatre_members').select('user_id')
            .eq('theatre_id', p.theatreId).eq('user_id', existing.id).maybeSingle()
        if (already) return { ok: false, error: 'Ta osoba jest już w zespole.' }
    }

    const active = existing ? await accountIsActive(existing.id) : false
    let userId = existing?.id ?? null
    const currentTheatreId = existing?.current_theatre_id ?? null
    let createdAccount = false

    if (!active) {
        // Sekret sprawdzamy przed wysyłką maila, żeby nie zaprosić kogoś bez możliwości wygenerowania kodu.
        try { encryptCode('000000') } catch (e) {
            console.error('addMemberWithInvite secret:', e instanceof Error ? e.message : e, INVITE_SECRET_ERROR)
            return { ok: false, error: CODE_FAILED }
        }
        const { data: theatre } = await p.supabase.from('theatres').select('name').eq('id', p.theatreId).maybeSingle()
        const inviterName = await inviterDisplayName(p.supabase, p.inviter.id, p.inviter.email)
        const { data: invite, error } = await sendInviteMail({ email: p.email, inviterName, theatreName: theatre?.name ?? 'teatru', role: p.role })
        if (error || !invite.user) {
            // Konto potwierdzone, ale zaproszenie nieprzyjęte: członkostwo i kod zakładamy mimo braku maila
            // (kierownik poda kod osobiście; „Wyślij ponownie” powie wprost, że Supabase nie wysyła).
            if (!(isAlreadyRegistered(error) && existing)) {
                console.error('addMemberWithInvite invite:', error)
                return { ok: false, error: INVITE_FAILED }
            }
        } else {
            userId = invite.user.id
            createdAccount = !existing
        }
    }
    if (!userId) return { ok: false, error: INVITE_FAILED }

    const rollback = async () => {
        await admin.from('theatre_members').delete().eq('theatre_id', p.theatreId).eq('user_id', userId!)
        if (createdAccount) {
            const { error } = await admin.auth.admin.deleteUser(userId!)
            if (error) console.error('addMemberWithInvite rollback deleteUser:', error)
        }
    }

    // Klient użytkownika: RLS members_write, strażnik i dziennik widzą zapraszającego (auth.uid()).
    const { error: memberError } = await loose(p.supabase).from('theatre_members').upsert({
        theatre_id: p.theatreId,
        user_id: userId,
        role: p.role,
        invited_by: p.inviter.id,
        joined_at: active ? new Date().toISOString() : null,
    }, { onConflict: 'theatre_id,user_id' })
    if (memberError) {
        console.error('addMemberWithInvite member:', memberError)
        if (createdAccount) await rollback()
        return { ok: false, error: GUARD_MESSAGES.find((m) => memberError.message?.includes(m)) ?? p.memberError }
    }

    let code: { code: string; expiresAt: string } | null = null
    if (!active) {
        try {
            code = await saveInviteCode(p.theatreId, userId, p.inviter.id)
        } catch (e) {
            console.error('addMemberWithInvite code:', e)
            await rollback()
            return { ok: false, error: CODE_FAILED }
        }
    }

    // Zatwierdzenie profilu: RLS nie pozwala kierownikowi zmieniać cudzego profilu.
    const { error: profileError } = await admin.from('profiles').update({
        status: 'approved',
        ...(currentTheatreId ? {} : { current_theatre_id: p.theatreId }),
    }).eq('id', userId)
    if (profileError) console.error('addMemberWithInvite profile:', profileError)

    return { ok: true, data: { invited: !active, code: code ? formatCode(code.code) : null, expiresAt: code?.expiresAt ?? null } }
}

// Teksty strażnika z bazy (migracja 20261018_team_managers): przekazujemy je użytkownikowi bez zmian.
export const GUARD_MESSAGES = [
    'Teatr musi mieć co najmniej jednego kierownika.',
    'Swojej roli nie zmienisz sam.',
    'Nie usuniesz siebie z zespołu.',
]
