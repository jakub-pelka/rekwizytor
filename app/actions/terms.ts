'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type TermInput = {
    performanceId: string
    date: string
    time: string
    kind: 'show' | 'rehearsal'
    cast?: 'first' | 'second' | 'other' | null
    title?: string | null
    venue?: string | null
    note?: string | null
    withProps?: boolean
}

export type UpdateTermInput = TermInput & {
    id: string
}

function normalizeTime(time: string): string {
    const trimmed = time.trim()
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return ''
    const hour = match[1].padStart(2, '0')
    const minute = match[2]
    return `${hour}:${minute}`
}

function formatShowDate(date: string, time: string): string {
    const cleanDate = date.trim()
    const cleanTime = normalizeTime(time)
    return `${cleanDate}T${cleanTime}:00`
}

function validateInput(input: TermInput): { ok: true; showDate: string } | { ok: false; error: string } {
    if (!input.performanceId?.trim()) {
        return { ok: false, error: 'Wybierz spektakl.' }
    }

    if (!input.date?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())) {
        return { ok: false, error: 'Wybierz datę terminu.' }
    }

    const normalizedTime = normalizeTime(input.time ?? '')
    if (!normalizedTime) {
        return { ok: false, error: 'Wpisz godzinę terminu, np. 19:00.' }
    }

    if (input.kind !== 'show' && input.kind !== 'rehearsal') {
        return { ok: false, error: 'Wybierz rodzaj terminu: spektakl albo próba.' }
    }

    return { ok: true, showDate: formatShowDate(input.date, input.time) }
}

function handleDbError(error: { code?: string; message?: string }): string {
    if (
        error.code === '23505' ||
        error.message?.includes('23505') ||
        error.message?.includes('show_lists_performance_id_show_date_key') ||
        error.message?.includes('duplicate key')
    ) {
        return 'Ten spektakl ma już termin o tej godzinie.'
    }
    return 'Nie udało się zapisać terminu. Sprawdź połączenie i spróbuj jeszcze raz.'
}

export async function createTerm(input: TermInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) {
        return { ok: false, error: 'Zaloguj się, żeby dodawać terminy.' }
    }

    const validation = validateInput(input)
    if (!validation.ok) {
        return validation
    }

    const row = {
        performance_id: input.performanceId.trim(),
        show_date: validation.showDate,
        kind: input.kind,
        cast: input.kind === 'show' ? (input.cast || null) : null,
        title: input.kind === 'rehearsal' ? (input.title?.trim() || null) : null,
        venue: input.venue?.trim() || null,
        note: input.note?.trim() || null,
        with_props: input.kind === 'rehearsal' ? (input.withProps ?? true) : true,
    }

    const { data, error } = await supabase
        .from('show_lists')
        .insert(row)
        .select('id')
        .single()

    if (error || !data) {
        return { ok: false, error: handleDbError(error ?? {}) }
    }

    revalidatePath('/[locale]/calendar', 'page')
    revalidatePath(`/[locale]/performances/${input.performanceId.trim()}`, 'page')
    return { ok: true, id: data.id }
}

export async function updateTerm(input: UpdateTermInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) {
        return { ok: false, error: 'Zaloguj się, żeby zmieniać terminy.' }
    }

    if (!input.id) {
        return { ok: false, error: 'Brak identyfikatora terminu.' }
    }

    const validation = validateInput(input)
    if (!validation.ok) {
        return validation
    }

    const { data: previous } = await supabase
        .from('show_lists')
        .select('performance_id')
        .eq('id', input.id)
        .maybeSingle()

    const row = {
        performance_id: input.performanceId.trim(),
        show_date: validation.showDate,
        kind: input.kind,
        cast: input.kind === 'show' ? (input.cast || null) : null,
        title: input.kind === 'rehearsal' ? (input.title?.trim() || null) : null,
        venue: input.venue?.trim() || null,
        note: input.note?.trim() || null,
        with_props: input.kind === 'rehearsal' ? (input.withProps ?? true) : true,
    }

    const { data, error } = await supabase
        .from('show_lists')
        .update(row)
        .eq('id', input.id)
        .select('id')

    if (error) {
        return { ok: false, error: handleDbError(error) }
    }
    // RLS nie zgłasza błędu, tylko pomija wiersz: 0 zmienionych wierszy to brak uprawnień, nie sukces.
    if (!data || data.length === 0) {
        return { ok: false, error: 'Nie masz uprawnień do zmiany tego terminu.' }
    }

    revalidatePath('/[locale]/calendar', 'page')
    revalidatePath(`/[locale]/performances/${input.performanceId.trim()}`, 'page')
    if (previous && previous.performance_id !== input.performanceId.trim()) {
        revalidatePath(`/[locale]/performances/${previous.performance_id}`, 'page')
    }
    return { ok: true, id: data[0].id }
}

export async function deleteTerm(id: string, performanceId?: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) {
        return { ok: false, error: 'Zaloguj się, żeby usuwać terminy.' }
    }

    const { data: term } = await supabase
        .from('show_lists')
        .select('performance_id, show_date')
        .eq('id', id)
        .maybeSingle()

    const { data: deleted, error } = await supabase.from('show_lists').delete().eq('id', id).select('id')
    if (error) {
        return { ok: false, error: 'Nie udało się usunąć terminu. Spróbuj jeszcze raz.' }
    }
    // RLS nie zgłasza błędu, tylko pomija wiersz: 0 usuniętych wierszy to brak uprawnień, nie sukces.
    if (!deleted || deleted.length === 0) {
        return { ok: false, error: 'Nie masz uprawnień do usunięcia tego terminu.' }
    }

    if (term) {
        await supabase
            .from('scene_checklists')
            .delete()
            .eq('performance_id', term.performance_id)
            .eq('show_date', term.show_date)
    }

    const perfId = performanceId || term?.performance_id
    revalidatePath('/[locale]/calendar', 'page')
    if (perfId) {
        revalidatePath(`/[locale]/performances/${perfId}`, 'page')
    }

    return { ok: true }
}
