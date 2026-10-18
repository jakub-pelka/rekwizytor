import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { TheatreRole } from '@/lib/access'

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
}

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
    }))

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
 * Wysyła zaproszenie (mail Supabase „Invite user”). Dane trafiają do szablonu jako {{ .Data.* }}.
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
    const roleText = ROLE_LABELS[params.role]
    return admin.auth.admin.inviteUserByEmail(params.email, {
        redirectTo: `${origin}/pl/auth/confirm?next=/pl/witaj`,
        data: {
            inviter_name: params.inviterName,
            theatre_name: params.theatreName,
            role_label: roleText,
            inviter_line: `${params.inviterName} zaprasza cię do ${params.theatreName}`,
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
