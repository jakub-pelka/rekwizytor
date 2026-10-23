'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TheatreRole } from '@/lib/access'

// Zatwierdzenie i odrzucenie konta czekającego na decyzję (migracja 20261023_approve_into_theatre).
// Uprawnienie sprawdza baza: decyduje kierownik pracowni bieżącego teatru (albo superadmin), a zatwierdzona osoba
// od razu trafia do tego teatru z wybraną rolą. Akcja pilnuje tylko sesji i poprawności danych.

const ROLES: TheatreRole[] = ['admin', 'member', 'viewer']

const AUTH_ERROR = 'Zaloguj się, żeby zatwierdzać konta.'
const FORBIDDEN_ERROR = 'Zatwierdzać może tylko kierownik pracowni.'
const NOT_PENDING_ERROR = 'To konto nie czeka już na zatwierdzenie.'
const SELF_ERROR = 'Nie możesz zatwierdzić ani odrzucić własnego konta.'
const NO_THEATRE_ERROR = 'Nie wybrano teatru.'
const ROLE_ERROR = 'Wybierz rolę: kierownik pracowni, rekwizytor albo podgląd.'
const INVALID_ERROR = 'Nie udało się rozpoznać konta do zatwierdzenia.'
const GENERIC_ERROR = 'Nie udało się zapisać decyzji. Spróbuj jeszcze raz.'

// Te same zdania rzucają funkcje w bazie, więc pokazujemy je wprost. Każdy inny błąd bazy zastępuje GENERIC_ERROR.
const DB_MESSAGES = [FORBIDDEN_ERROR, NOT_PENDING_ERROR, SELF_ERROR, NO_THEATRE_ERROR, ROLE_ERROR]

export async function approveUser(userId: string, newStatus: 'approved' | 'rejected', role?: TheatreRole) {
    const supabase = await createClient()

    try {
        // 1. Sesja
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: AUTH_ERROR }
        }

        // 2. Dane wejściowe (rola sprawdzona przed wywołaniem bazy)
        if (!userId || typeof userId !== 'string') {
            return { error: INVALID_ERROR }
        }

        if (!['approved', 'rejected'].includes(newStatus)) {
            return { error: INVALID_ERROR }
        }

        if (newStatus === 'approved' && (!role || !ROLES.includes(role))) {
            return { error: ROLE_ERROR }
        }

        // 3. Nie decydujemy o sobie
        if (userId === user.id) {
            return { error: SELF_ERROR }
        }

        // 4. Decyzja w jednej transakcji w bazie. Funkcje z migracji 20261023 nie mają jeszcze typów
        // w types/supabase.ts (plik generowany), więc rpc wołamy na kliencie bez typów bazy.
        const db = supabase as unknown as SupabaseClient
        const { error: rpcError } = newStatus === 'approved'
            ? await db.rpc('approve_pending_user', { p_user: userId, p_role: role })
            : await db.rpc('reject_pending_user', { p_user: userId })

        if (rpcError) {
            console.error('Error updating user status:', rpcError)
            return { error: DB_MESSAGES.find((m) => rpcError.message?.includes(m)) ?? GENERIC_ERROR }
        }

        // 5. Audit log (console for now)
        console.log(`User ${user.id} changed status of ${userId} to ${newStatus}${newStatus === 'approved' ? ` (role ${role})` : ''}`)

        revalidatePath('/[locale]/settings', 'page')
        revalidatePath('/[locale]/settings/team', 'page')
        return { success: true }

    } catch (error) {
        console.error('Unexpected error in approveUser:', error)
        return { error: GENERIC_ERROR }
    }
}
