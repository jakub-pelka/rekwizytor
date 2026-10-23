'use server'

import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { loose, ROLE_LABELS, EMAIL_RE, EMAIL_INVALID, type TheatreRole } from '@/lib/team'
import { checkCode, hashIp, MAX_ATTEMPTS, normalizeCode } from '@/lib/invite-code'

// Publiczne wejście kodem od kierownika: działa BEZ sesji, więc cały dostęp do danych idzie kluczem serwisowym,
// a do klienta wracają wyłącznie pola InviteLookup (bez identyfikatorów, kodu, mac, cudzych e-maili).

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

export type InviteLookup =
    | { state: 'code'; inviterName: string | null; theatreName: string; roleLabel: string; attemptsLeft: number; expiresAt: string }
    | { state: 'locked' | 'expired'; inviterName: string | null; theatreName: string; expiresAt: string }
    | { state: 'revoked'; inviterName: string | null; theatreName: string }
    | { state: 'account' }
    | { state: 'none' }

const RATE_ERROR = 'Za dużo prób z tego urządzenia. Spróbuj za godzinę.'
const GENERIC_ERROR = 'Nie udało się. Spróbuj jeszcze raz.'
const RATE_LIMIT = 20

type Admin = ReturnType<typeof loose>

type InviteRow = {
    theatre_id: string
    user_id: string
    code_mac: string
    expires_at: string
    attempts: number
    locked_at: string | null
    created_at: string
}

type Found = {
    lookup: InviteLookup
    // Tylko wewnątrz serwera: potrzebne do sprawdzenia kodu.
    invite: InviteRow | null
    email: string
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`)

async function clientIp(): Promise<string> {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
    return forwarded || h.get('x-real-ip')?.trim() || 'local'
}

/** Zapisuje trafienie i sprawdza limit na ip_hash. Zwraca false, gdy limit przekroczony. */
async function registerHit(db: Admin): Promise<boolean> {
    const ipHash = hashIp(await clientIp())
    const now = Date.now()
    const { error: insertError } = await db.from('invite_lookup_hits').insert({ ip_hash: ipHash })
    if (insertError) throw new Error(`invite_lookup_hits insert: ${insertError.message}`)
    // Sprzątanie starych trafień (nie blokuje odpowiedzi przy błędzie).
    await db.from('invite_lookup_hits').delete().lt('at', new Date(now - 24 * 3600 * 1000).toISOString())
    const { count, error } = await db.from('invite_lookup_hits')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('at', new Date(now - 3600 * 1000).toISOString())
    if (error) throw new Error(`invite_lookup_hits count: ${error.message}`)
    return (count ?? 0) <= RATE_LIMIT
}

function stateOf(inv: InviteRow, theatreName: string, inviterName: string | null, roleLabel: string): InviteLookup {
    if (inv.locked_at) return { state: 'locked', inviterName, theatreName, expiresAt: inv.expires_at }
    if (new Date(inv.expires_at).getTime() <= Date.now()) return { state: 'expired', inviterName, theatreName, expiresAt: inv.expires_at }
    return {
        state: 'code', inviterName, theatreName, roleLabel,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - inv.attempts), expiresAt: inv.expires_at,
    }
}

async function findInvite(db: Admin, address: string): Promise<Found> {
    const like = escapeLike(address)
    const none: Found = { lookup: { state: 'none' }, invite: null, email: address }

    const { data: profile } = await db.from('profiles').select('id').ilike('email', like).maybeSingle()

    if (profile) {
        const { data: members } = await db.from('theatre_members')
            .select('theatre_id, role, invited_by, joined_at')
            .eq('user_id', profile.id)
        const rows = (members ?? []) as { theatre_id: string; role: string; invited_by: string | null; joined_at: string | null }[]
        const pending = rows.filter((m) => !m.joined_at)

        if (pending.length > 0) {
            const { data: invites } = await db.from('theatre_invites')
                .select('theatre_id, user_id, code_mac, expires_at, attempts, locked_at, created_at')
                .eq('user_id', profile.id)
                .in('theatre_id', pending.map((m) => m.theatre_id))
                .order('created_at', { ascending: false })
                .limit(1)
            const invite = ((invites ?? []) as InviteRow[])[0]
            if (invite) {
                const member = pending.find((m) => m.theatre_id === invite.theatre_id)!
                const [{ data: theatre }, inviter] = await Promise.all([
                    db.from('theatres').select('name').eq('id', invite.theatre_id).maybeSingle(),
                    member.invited_by
                        ? db.from('profiles').select('full_name, email').eq('id', member.invited_by).maybeSingle()
                        : Promise.resolve({ data: null }),
                ])
                const inviterName = (inviter.data?.full_name?.trim() || inviter.data?.email || null) as string | null
                const roleLabel = ROLE_LABELS[member.role as TheatreRole] ?? member.role
                return { lookup: stateOf(invite, theatre?.name ?? 'teatr', inviterName, roleLabel), invite, email: address }
            }
        }

        // Dołączone członkostwo albo konto bez żadnych zaproszeń: zwykłe logowanie.
        if (rows.some((m) => m.joined_at) || rows.length === 0) return { lookup: { state: 'account' }, invite: null, email: address }
    }

    // Brak oczekującego zaproszenia z kodem: czy ostatnie zdarzenie dla adresu to cofnięcie zaproszenia?
    const { data: events } = await db.from('theatre_member_events')
        .select('theatre_id, action')
        .ilike('user_email', like)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
    const last = ((events ?? []) as { theatre_id: string; action: string }[])[0]
    if (last?.action === 'removed') {
        const { data: theatre } = await db.from('theatres').select('name').eq('id', last.theatre_id).maybeSingle()
        return { lookup: { state: 'revoked', inviterName: null, theatreName: theatre?.name ?? 'teatr' }, invite: null, email: address }
    }

    return profile ? { lookup: { state: 'none' }, invite: null, email: address } : none
}

export async function lookupInvite(email: string): Promise<Result<InviteLookup>> {
    try {
        const address = String(email ?? '').trim().toLowerCase()
        if (!EMAIL_RE.test(address)) return { ok: false, error: EMAIL_INVALID }
        const db = loose(createAdminClient())
        if (!(await registerHit(db))) return { ok: false, error: RATE_ERROR }
        const found = await findInvite(db, address)
        return { ok: true, data: found.lookup }
    } catch (e) {
        console.error('lookupInvite:', e)
        return { ok: false, error: GENERIC_ERROR }
    }
}

/** Atomowe attempts+1 (compare-and-swap po wartości licznika, bo klient Supabase nie ma `attempts = attempts + 1`). */
async function bumpAttempts(db: Admin, inv: InviteRow): Promise<InviteRow | null> {
    let current = inv.attempts
    for (let i = 0; i < 5; i++) {
        const next = current + 1
        const { data } = await db.from('theatre_invites')
            .update({ attempts: next, ...(next >= MAX_ATTEMPTS ? { locked_at: new Date().toISOString() } : {}) })
            .eq('theatre_id', inv.theatre_id).eq('user_id', inv.user_id)
            .eq('attempts', current).is('locked_at', null)
            .select('theatre_id, user_id, code_mac, expires_at, attempts, locked_at, created_at')
        const row = ((data ?? []) as InviteRow[])[0]
        if (row) return row
        // Ktoś wyprzedził (równoległa próba) albo blokada już ustawiona: odczytaj stan i spróbuj od nowa.
        const { data: fresh } = await db.from('theatre_invites')
            .select('theatre_id, user_id, code_mac, expires_at, attempts, locked_at, created_at')
            .eq('theatre_id', inv.theatre_id).eq('user_id', inv.user_id).maybeSingle()
        if (!fresh) return null
        if ((fresh as InviteRow).locked_at) return fresh as InviteRow
        current = (fresh as InviteRow).attempts
    }
    return null
}

/** Zakłada sesję w ciasteczkach dla konta z zaproszeniem. Zwraca false przy błędzie. */
async function startSession(address: string): Promise<boolean> {
    const admin = createAdminClient()
    const supabase = await createClient()
    // Konto zaproszone przez inviteUserByEmail ma niepotwierdzony e-mail. Najpierw 'magiclink'
    // (verifyOtp potwierdza e-mail i zwraca sesję); gdyby GoTrue go nie przyjął, próbujemy 'invite'.
    for (const type of ['magiclink', 'invite'] as const) {
        const { data, error } = await admin.auth.admin.generateLink(
            type === 'magiclink' ? { type: 'magiclink', email: address } : { type: 'invite', email: address },
        )
        const tokenHash = data?.properties?.hashed_token
        if (error || !tokenHash) continue
        const { data: session, error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (!verifyError && session?.session) return true
    }
    return false
}

export async function verifyInviteCode(email: string, code: string): Promise<Result<{ next: 'details' } | InviteLookup>> {
    try {
        const address = String(email ?? '').trim().toLowerCase()
        if (!EMAIL_RE.test(address)) return { ok: false, error: EMAIL_INVALID }
        const db = loose(createAdminClient())
        if (!(await registerHit(db))) return { ok: false, error: RATE_ERROR }

        const found = await findInvite(db, address)
        // Kod przyjmujemy tylko dla zaproszenia w stanie 'code' (zablokowane i wygasłe nie, nawet z dobrym kodem).
        if (found.lookup.state !== 'code' || !found.invite) return { ok: true, data: found.lookup }
        const inv = found.invite

        const normalized = normalizeCode(String(code ?? ''))
        const good = normalized !== null && checkCode(inv.theatre_id, inv.user_id, normalized, inv.code_mac)

        if (!good) {
            await bumpAttempts(db, inv)
            const after = await findInvite(db, address)
            return { ok: true, data: after.lookup }
        }

        if (!(await startSession(address))) {
            console.error('verifyInviteCode: nie udało się założyć sesji')
            return { ok: false, error: GENERIC_ERROR }
        }
        return { ok: true, data: { next: 'details' } }
    } catch (e) {
        console.error('verifyInviteCode:', e)
        return { ok: false, error: GENERIC_ERROR }
    }
}
