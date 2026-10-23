'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { addMemberWithInvite } from '@/lib/team'

// Teatry (migracja 20261011_theatres): baza pokazuje każdemu tylko jego bieżący teatr (profiles.current_theatre_id),
// więc reszta aplikacji nie filtruje po teatrze. Tu: przełączanie teatru, a dla superadmina zakładanie teatrów
// i zespół. Teatry zakłada tylko superadmin (profiles.role = 'admin'); pilnują tego też reguły w bazie.

export type TheatreRole = 'admin' | 'member' | 'viewer'
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

const AUTH_ERROR = 'Zaloguj się, żeby zmieniać teatry.'
const SUPERADMIN_ERROR = 'Teatry zakłada i obsadza tylko administrator aplikacji.'

async function session() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
    return { supabase, user, isSuperadmin: profile?.role === 'admin' && profile?.status === 'approved' }
}

/** Zmiana bieżącego teatru. Baza i tak pokaże tylko teatr, do którego należysz (superadmin: dowolny). */
export async function switchTheatre(theatreId: string): Promise<Result> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    const { error } = await s.supabase.from('profiles').update({ current_theatre_id: theatreId }).eq('id', s.user.id)
    if (error) return { ok: false, error: 'Nie udało się przełączyć teatru. Spróbuj jeszcze raz.' }
    revalidatePath('/', 'layout')
    return { ok: true }
}

/** Nowy teatr (superadmin). Zakładający od razu do niego przechodzi, żeby mógł go przygotować. */
export async function createTheatre(name: string): Promise<Result<{ id: string }>> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    if (!s.isSuperadmin) return { ok: false, error: SUPERADMIN_ERROR }
    const clean = name.trim()
    if (!clean) return { ok: false, error: 'Wpisz nazwę teatru, np. „Teatr Śląski”.' }

    const { data, error } = await s.supabase.from('theatres').insert({ name: clean, created_by: s.user.id }).select('id').single()
    if (error || !data) return { ok: false, error: 'Nie udało się założyć teatru. Spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/settings/theatres', 'page')
    return { ok: true, data: { id: data.id } }
}

export async function renameTheatre(theatreId: string, name: string): Promise<Result> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    if (!s.isSuperadmin) return { ok: false, error: SUPERADMIN_ERROR }
    const clean = name.trim()
    if (!clean) return { ok: false, error: 'Nazwa teatru nie może być pusta.' }
    const { error } = await s.supabase.from('theatres').update({ name: clean }).eq('id', theatreId)
    if (error) return { ok: false, error: 'Nie udało się zmienić nazwy. Spróbuj jeszcze raz.' }
    revalidatePath('/', 'layout')
    return { ok: true }
}

/**
 * Dodanie osoby do teatru po adresie e-mail (superadmin). Gdy konta jeszcze nie ma (albo nie przyjęło zaproszenia),
 * wysyłamy zaproszenie z linkiem do /witaj i generujemy kod 6 cyfr (code „482 913”, expiresAt). Konto aktywne dodajemy
 * od razu (invited=false, code null). Osoba dodana do teatru jest zatwierdzona i ma go jako bieżący, jeśli nie miała innego.
 */
export async function addTheatreMember(theatreId: string, email: string, role: TheatreRole): Promise<Result<{ invited: boolean; code: string | null; expiresAt: string | null }>> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    if (!s.isSuperadmin) return { ok: false, error: SUPERADMIN_ERROR }
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'Wpisz poprawny adres e-mail, np. anna@teatr.pl.' }

    const result = await addMemberWithInvite({
        supabase: s.supabase,
        inviter: s.user,
        theatreId,
        email: address,
        role,
        memberError: 'Nie udało się dodać osoby do teatru. Spróbuj jeszcze raz.',
    })
    if (!result.ok) return result
    revalidatePath('/[locale]/settings/theatres', 'page')
    return { ok: true, data: result.data }
}

export async function setTheatreMemberRole(theatreId: string, userId: string, role: TheatreRole): Promise<Result> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    const { error } = await s.supabase.from('theatre_members').update({ role }).eq('theatre_id', theatreId).eq('user_id', userId)
    if (error) return { ok: false, error: 'Nie udało się zmienić roli. Spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/settings/theatres', 'page')
    return { ok: true }
}

/** Usunięcie z teatru odbiera dostęp do jego danych; konto zostaje. */
export async function removeTheatreMember(theatreId: string, userId: string): Promise<Result> {
    const s = await session()
    if (!s) return { ok: false, error: AUTH_ERROR }
    const { error } = await s.supabase.from('theatre_members').delete().eq('theatre_id', theatreId).eq('user_id', userId)
    if (error) return { ok: false, error: 'Nie udało się usunąć osoby z teatru. Spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/settings/theatres', 'page')
    return { ok: true }
}
