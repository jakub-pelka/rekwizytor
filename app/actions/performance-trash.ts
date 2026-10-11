'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { refreshSearchIndex } from './unified-search'

// Usunięcie spektaklu to przeniesienie do kosza (deleted_at): rozpiska, terminy i notatki zostają,
// więc da się to cofnąć z powiadomienia albo przywrócić z kosza.
async function setDeleted(id: string, deletedAt: string | null): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać spektakle.' }
    const { error } = await supabase.from('performances').update({ deleted_at: deletedAt }).eq('id', id)
    if (error) return { ok: false, error: 'Nie udało się zapisać zmiany. Sprawdź połączenie i spróbuj jeszcze raz.' }
    await refreshSearchIndex().catch(() => undefined)
    revalidatePath('/[locale]/performances', 'page')
    revalidatePath('/[locale]/calendar', 'page')
    revalidatePath('/[locale]', 'page')
    return { ok: true }
}

export async function trashPerformance(id: string) {
    return setDeleted(id, new Date().toISOString())
}

export async function restorePerformance(id: string) {
    return setDeleted(id, null)
}
