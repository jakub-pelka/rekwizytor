'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
    accountIsActive, addMemberWithInvite, appOrigin, CODE_FAILED, EMAIL_INVALID, EMAIL_RE, GUARD_MESSAGES, INVITE_FAILED,
    inviterDisplayName, isAlreadyRegistered, loose, readActiveInviteCode, saveInviteCode, sendInviteMail, type TheatreRole,
} from '@/lib/team'
import { formatCode } from '@/lib/invite-code'

// Zespół teatru dla kierownika pracowni. Każda akcja sprawdza na serwerze: sesję, bieżący teatr oraz
// uprawnienie (superadmin albo kierownik tego teatru). Zmiany w theatre_members robimy klientem użytkownika, żeby zadziałały
// reguły RLS, strażnik z bazy (ostatni kierownik, „sam siebie”) i dziennik z auth.uid(). Klucz serwisowy tylko tam,
// gdzie RLS nie pozwala: zaproszenie, szukanie konta po e-mailu, zatwierdzenie profilu, usunięcie niewykorzystanego konta.

export type { TheatreRole }
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

const AUTH_ERROR = 'Zaloguj się, żeby zarządzać zespołem.'
const NO_THEATRE_ERROR = 'Nie wybrano teatru.'
const FORBIDDEN_ERROR = 'Zespołem zarządza kierownik pracowni.'
const GENERIC_ERROR = 'Nie udało się. Spróbuj jeszcze raz.'
const ROLES: TheatreRole[] = ['admin', 'member', 'viewer']

function dbMessage(error: { message?: string } | null, fallback: string, context: string): string {
    const guard = GUARD_MESSAGES.find((m) => error?.message?.includes(m))
    if (guard) return guard
    console.error(`${context}:`, error)
    return fallback
}

async function context(): Promise<{ ok: false; error: string } | {
    ok: true
    supabase: Awaited<ReturnType<typeof createClient>>
    user: { id: string; email?: string }
    theatreId: string
    isSuperadmin: boolean
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: AUTH_ERROR }

    const [{ data: profile }, { data: active }] = await Promise.all([
        supabase.from('profiles').select('role, status, current_theatre_id').eq('id', user.id).maybeSingle(),
        supabase.rpc('active_theatre_id'),
    ])
    const theatreId = (active as string | null) ?? profile?.current_theatre_id ?? null
    if (!theatreId) return { ok: false, error: NO_THEATRE_ERROR }

    const isSuperadmin = profile?.role === 'admin' && profile?.status === 'approved'
    if (!isSuperadmin) {
        const { data: isManager } = await supabase.rpc('is_theatre_admin', { t: theatreId })
        if (!isManager) return { ok: false, error: FORBIDDEN_ERROR }
    }
    return { ok: true, supabase, user, theatreId, isSuperadmin }
}

function refresh() {
    revalidatePath('/[locale]/settings/team', 'page')
    revalidatePath('/[locale]/settings', 'page')
}

const normalize = (email: string) => email.trim().toLowerCase()

/** Stan adresu przed wysłaniem: nowy (zaproszenie), istniejące konto (dodamy od razu) albo już w tym teatrze. */
export async function checkInviteEmail(email: string): Promise<Result<{ state: 'new' | 'existing' | 'member' }>> {
    const c = await context()
    if (!c.ok) return c
    const address = normalize(email)
    if (!EMAIL_RE.test(address)) return { ok: false, error: EMAIL_INVALID }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').ilike('email', address).maybeSingle()
    if (!profile) return { ok: true, data: { state: 'new' } }

    const { data: member } = await c.supabase.from('theatre_members').select('user_id')
        .eq('theatre_id', c.theatreId).eq('user_id', profile.id).maybeSingle()
    if (member) return { ok: true, data: { state: 'member' } }
    // Konto, które nie przyjęło jeszcze żadnego zaproszenia, traktujemy jak nowe (dostanie mail).
    return { ok: true, data: { state: (await accountIsActive(profile.id)) ? 'existing' : 'new' } }
}

/**
 * Zaproszenie do bieżącego teatru. invited=false: istniejące konto dodane od razu, bez maila i kodu (code null).
 * Nowe konto: mail z linkiem do /witaj i kod 6 cyfr (code „482 913”, expiresAt) do przekazania osobie.
 */
export async function inviteToTeam(email: string, role: TheatreRole): Promise<Result<{ invited: boolean; code: string | null; expiresAt: string | null }>> {
    const c = await context()
    if (!c.ok) return c
    const address = normalize(email)
    if (!EMAIL_RE.test(address)) return { ok: false, error: EMAIL_INVALID }
    if (!ROLES.includes(role)) return { ok: false, error: GENERIC_ERROR }

    const result = await addMemberWithInvite({
        supabase: c.supabase,
        inviter: c.user,
        theatreId: c.theatreId,
        email: address,
        role,
        failIfMember: true,
        memberError: 'Nie udało się dodać osoby do zespołu. Spróbuj jeszcze raz.',
    })
    if (!result.ok) return result
    refresh()
    return { ok: true, data: result.data }
}

/** Dane pracownika czekającego na zaproszenie (joined_at NULL) w bieżącym teatrze. */
async function pendingMember(c: Extract<Awaited<ReturnType<typeof context>>, { ok: true }>, userId: string) {
    const { data } = await loose(c.supabase).from('theatre_members').select('role, joined_at')
        .eq('theatre_id', c.theatreId).eq('user_id', userId).maybeSingle()
    const row = data as { role: TheatreRole; joined_at: string | null } | null
    return row && row.joined_at === null ? row : null
}

/** Kod zaproszenia osoby oczekującej (tylko gdy aktywny: nie wygasł, nie jest zablokowany). */
export async function showInviteCode(userId: string): Promise<Result<{ code: string; expiresAt: string; sentAt: string }>> {
    const c = await context()
    if (!c.ok) return c
    const pending = await pendingMember(c, userId)
    if (!pending) return { ok: false, error: 'To zaproszenie zostało już przyjęte albo cofnięte.' }
    try {
        const active = await readActiveInviteCode(c.theatreId, userId)
        if (!active) return { ok: false, error: 'Ten kod nie jest już ważny. Wygeneruj nowy.' }
        return { ok: true, data: { ...active, code: formatCode(active.code) } }
    } catch (e) {
        console.error('showInviteCode:', e)
        return { ok: false, error: CODE_FAILED }
    }
}

/** Nowy kod: nowe 7 dni, zerowy licznik prób, zdjęta blokada. Poprzedni kod przestaje działać. */
export async function regenerateInviteCode(userId: string): Promise<Result<{ code: string; expiresAt: string }>> {
    const c = await context()
    if (!c.ok) return c
    const pending = await pendingMember(c, userId)
    if (!pending) return { ok: false, error: 'To zaproszenie zostało już przyjęte albo cofnięte.' }
    try {
        const fresh = await saveInviteCode(c.theatreId, userId, c.user.id)
        refresh()
        return { ok: true, data: { code: formatCode(fresh.code), expiresAt: fresh.expiresAt } }
    } catch (e) {
        console.error('regenerateInviteCode:', e)
        return { ok: false, error: CODE_FAILED }
    }
}

/**
 * Ponowna wysyłka maila zaproszenia (ten sam witaj_url); kodu nie zmienia. Dla konta bez potwierdzonego e-maila
 * inviteUserByEmail wysyła zaproszenie ponownie. Gdy konto jest już potwierdzone, Supabase odmawia (email_exists):
 * wtedy mówimy wprost, że mail nie pójdzie, a kod można podać osobiście.
 */
export async function resendInvite(userId: string): Promise<Result> {
    const c = await context()
    if (!c.ok) return c
    const pending = await pendingMember(c, userId)
    if (!pending) return { ok: false, error: 'To zaproszenie zostało już przyjęte albo cofnięte.' }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle()
    if (!profile?.email) return { ok: false, error: INVITE_FAILED }

    const { data: theatre } = await c.supabase.from('theatres').select('name').eq('id', c.theatreId).maybeSingle()
    const inviterName = await inviterDisplayName(c.supabase, c.user.id, c.user.email)
    const { error } = await sendInviteMail({ email: profile.email, inviterName, theatreName: theatre?.name ?? 'teatru', role: pending.role })
    if (error) {
        console.error('resendInvite invite:', error)
        if (isAlreadyRegistered(error)) {
            return { ok: false, error: 'Nie wyślemy maila ponownie: ta osoba ma już potwierdzone konto. Podaj jej kod osobiście („Pokaż kod”).' }
        }
        return { ok: false, error: INVITE_FAILED }
    }
    refresh()
    return { ok: true }
}

/** Cofnięcie zaproszenia: usuwa oczekujące członkostwo, a niewykorzystane konto (bez logowania, bez innych teatrów) także z auth. */
export async function revokeInvite(userId: string): Promise<Result> {
    const c = await context()
    if (!c.ok) return c
    const pending = await pendingMember(c, userId)
    if (!pending) return { ok: false, error: 'To zaproszenie zostało już przyjęte albo cofnięte.' }

    const { error } = await c.supabase.from('theatre_members').delete().eq('theatre_id', c.theatreId).eq('user_id', userId)
    if (error) return { ok: false, error: dbMessage(error, 'Nie udało się cofnąć zaproszenia. Spróbuj jeszcze raz.', 'revokeInvite') }

    const admin = createAdminClient()
    const { count } = await admin.from('theatre_members').select('user_id', { count: 'exact', head: true }).eq('user_id', userId)
    if (!count) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId)
        if (authUser?.user && !authUser.user.last_sign_in_at) {
            const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
            if (deleteError) console.error('revokeInvite deleteUser:', deleteError)
        }
    }
    refresh()
    return { ok: true }
}

/** Zmiana roli. Zwraca poprzednią rolę, żeby ekran mógł zaproponować „Cofnij”. */
export async function setMemberRole(userId: string, role: TheatreRole): Promise<Result<{ previous: TheatreRole }>> {
    const c = await context()
    if (!c.ok) return c
    if (!ROLES.includes(role)) return { ok: false, error: GENERIC_ERROR }

    const { data: current } = await c.supabase.from('theatre_members').select('role')
        .eq('theatre_id', c.theatreId).eq('user_id', userId).maybeSingle()
    if (!current) return { ok: false, error: 'Tej osoby nie ma już w zespole.' }
    const previous = current.role as TheatreRole
    if (previous === role) return { ok: true, data: { previous } }

    const { error } = await c.supabase.from('theatre_members').update({ role })
        .eq('theatre_id', c.theatreId).eq('user_id', userId)
    if (error) return { ok: false, error: dbMessage(error, 'Nie udało się zmienić roli. Spróbuj jeszcze raz.', 'setMemberRole') }
    refresh()
    return { ok: true, data: { previous } }
}

/** Usunięcie z zespołu odbiera dostęp do teatru; konto zostaje. */
export async function removeFromTeam(userId: string): Promise<Result> {
    const c = await context()
    if (!c.ok) return c
    const { error } = await c.supabase.from('theatre_members').delete().eq('theatre_id', c.theatreId).eq('user_id', userId)
    if (error) return { ok: false, error: dbMessage(error, 'Nie udało się usunąć osoby z zespołu. Spróbuj jeszcze raz.', 'removeFromTeam') }
    refresh()
    return { ok: true }
}

/** Mail z resetem hasła dla aktywnej osoby zespołu. */
export async function sendPasswordReset(userId: string): Promise<Result> {
    const c = await context()
    if (!c.ok) return c
    const { data: member } = await loose(c.supabase).from('theatre_members').select('joined_at')
        .eq('theatre_id', c.theatreId).eq('user_id', userId).maybeSingle()
    if (!member) return { ok: false, error: 'Tej osoby nie ma już w zespole.' }
    if ((member as { joined_at: string | null }).joined_at === null) return { ok: false, error: 'Ta osoba nie przyjęła jeszcze zaproszenia. Wyślij jej zaproszenie ponownie.' }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle()
    if (!profile?.email) return { ok: false, error: GENERIC_ERROR }
    const { error } = await c.supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${await appOrigin()}/pl/auth/confirm?next=/pl/update-password`,
    })
    if (error) {
        console.error('sendPasswordReset:', error)
        return { ok: false, error: 'Nie udało się wysłać maila. Spróbuj jeszcze raz.' }
    }
    return { ok: true }
}
