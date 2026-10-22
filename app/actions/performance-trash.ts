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

const FOREVER_FAILED = 'Nie udało się usunąć spektaklu. Sprawdź połączenie i spróbuj jeszcze raz.'
const FOREVER_ADMIN_ONLY = 'Usuwać na zawsze może tylko kierownik pracowni.'

// Usunięcie na zawsze. Grupa powiązana ze spektaklem blokuje usunięcie (klucz obcy bez CASCADE), więc najpierw:
// automatyczna grupa spektaklu (ta sama nazwa, bez przedmiotów) znika, każda inna zostaje w magazynie, tylko odpięta.
// Polityka RLS pozwala kasować tylko kierownikowi: 0 usuniętych wierszy to brak uprawnień, nie sukces.
export async function deletePerformanceForever(id: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać spektakle.' }

    const { data: perf, error: perfError } = await supabase.from('performances').select('id, title, theatre_id').eq('id', id).maybeSingle()
    if (perfError) return { ok: false, error: FOREVER_FAILED }
    if (!perf) return { ok: false, error: 'Nie znaleziono tego spektaklu. Odśwież stronę.' }
    // Sprawdzamy uprawnienie przed ruszaniem grup, żeby odmowa nie zostawiła spektaklu z odpiętymi grupami.
    if (!perf.theatre_id) return { ok: false, error: FOREVER_ADMIN_ONLY }
    const { data: isManager, error: roleError } = await supabase.rpc('is_theatre_admin', { t: perf.theatre_id })
    if (roleError) return { ok: false, error: FOREVER_FAILED }
    if (!isManager) return { ok: false, error: FOREVER_ADMIN_ONLY }

    const { data: groups, error: groupsError } = await supabase.from('groups').select('id, name').eq('performance_id', id)
    if (groupsError) return { ok: false, error: FOREVER_FAILED }

    if (groups && groups.length > 0) {
        const { data: used, error: usedError } = await supabase.from('group_items').select('group_id').in('group_id', groups.map(g => g.id))
        if (usedError) return { ok: false, error: FOREVER_FAILED }
        const withItems = new Set((used ?? []).map(row => row.group_id))
        const isAuto = (g: { id: string; name: string }) => !withItems.has(g.id) && g.name.trim() === perf.title.trim()
        const removable = groups.filter(isAuto).map(g => g.id)
        const keep = groups.filter(g => !isAuto(g)).map(g => g.id)

        if (keep.length > 0) {
            const { error } = await supabase.from('groups').update({ performance_id: null }).in('id', keep)
            if (error) return { ok: false, error: FOREVER_FAILED }
        }
        if (removable.length > 0) {
            const { error } = await supabase.from('groups').delete().in('id', removable)
            if (error) return { ok: false, error: FOREVER_FAILED }
        }
    }

    const { data: deleted, error } = await supabase.from('performances').delete().eq('id', id).select('id')
    if (error) return { ok: false, error: FOREVER_FAILED }
    if (!deleted || deleted.length === 0) return { ok: false, error: FOREVER_ADMIN_ONLY }

    await refreshSearchIndex().catch(() => undefined)
    revalidatePath('/[locale]/performances', 'page')
    revalidatePath('/[locale]/calendar', 'page')
    revalidatePath('/[locale]/trash', 'page')
    revalidatePath('/[locale]', 'page')
    return { ok: true }
}
