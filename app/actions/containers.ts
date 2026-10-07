'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type ContainerKind = 'wardrobe' | 'shelf' | 'trunk' | 'box'

const KINDS: ContainerKind[] = ['wardrobe', 'shelf', 'trunk', 'box']

/** Najwyżej 3 poziomy pojemników pod pomieszczeniem (szafa › półka › pudło), POMYSLY 13. */
const MAX_DEPTH = 3

type Result = { ok: true; id: string } | { ok: false; error: string }

async function chain(supabase: Awaited<ReturnType<typeof createClient>>, id: string | null) {
    const path: { id: string; belongs_to: string | null }[] = []
    let current = id
    for (let i = 0; i < 8 && current; i++) {
        const { data } = await supabase.from('locations').select('id, belongs_to').eq('id', current).maybeSingle()
        if (!data) break
        path.push(data)
        current = data.belongs_to
    }
    return path
}

/** Poziom pojemnika: 0 = pomieszczenie, 1 = pierwszy pojemnik w pomieszczeniu itd. */
const depthOf = (path: unknown[]) => path.length

async function subtreeHeight(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<number> {
    const { data } = await supabase.from('locations').select('id').eq('belongs_to', id)
    if (!data?.length) return 0
    const heights = await Promise.all(data.map(c => subtreeHeight(supabase, c.id)))
    return 1 + Math.max(...heights)
}

export async function createContainer(input: { name: string; kind: ContainerKind; parentId: string }): Promise<Result> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać magazyn.' }
    const name = input.name.trim()
    if (!name) return { ok: false, error: 'Wpisz nazwę pojemnika, np. „Szafa B”.' }
    if (!KINDS.includes(input.kind)) return { ok: false, error: 'Wybierz rodzaj pojemnika.' }

    const parentPath = await chain(supabase, input.parentId)
    if (parentPath.length === 0) return { ok: false, error: 'Nie znaleziono miejsca, do którego chcesz dodać pojemnik.' }
    // pomieszczenie to poziom 0; nowy pojemnik byłby na poziomie depthOf(parentPath)
    if (depthOf(parentPath) > MAX_DEPTH) {
        return { ok: false, error: 'Pojemniki można zagnieżdżać najwyżej na trzech poziomach, np. szafa, półka, pudło.' }
    }

    const { data, error } = await supabase
        .from('locations')
        .insert({ name, kind: input.kind, belongs_to: input.parentId, type: 'other' })
        .select('id')
        .single()
    if (error || !data) return { ok: false, error: 'Nie udało się dodać pojemnika. Sprawdź połączenie i spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/groups', 'page')
    return { ok: true, id: data.id }
}

/** Przeniesienie pojemnika z jego zawartością: bez cykli i z zachowaniem limitu głębokości. */
export async function moveContainer(id: string, newParentId: string): Promise<Result> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać magazyn.' }

    const parentPath = await chain(supabase, newParentId)
    if (parentPath.length === 0) return { ok: false, error: 'Nie znaleziono miejsca docelowego.' }
    if (parentPath.some(p => p.id === id)) {
        return { ok: false, error: 'Nie można przenieść pojemnika do jego własnego wnętrza.' }
    }
    const height = await subtreeHeight(supabase, id)
    if (depthOf(parentPath) + 1 + height > MAX_DEPTH + 1) {
        return { ok: false, error: 'Po przeniesieniu pojemniki byłyby zagnieżdżone głębiej niż na trzech poziomach.' }
    }

    const { error } = await supabase.from('locations').update({ belongs_to: newParentId }).eq('id', id)
    if (error) return { ok: false, error: 'Nie udało się przenieść pojemnika. Spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/groups', 'page')
    return { ok: true, id }
}
