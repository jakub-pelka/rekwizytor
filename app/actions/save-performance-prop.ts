'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { generateAI, isAIAvailable, parseAIJson } from '@/utils/ai/client'
import type { Database } from '@/types/supabase'

// Podział opisu: najpierw darmowa Gemma z OpenRouter, ten sam model płatny jako zapas (darmowe bywają przeciążone, 429).
// W porównaniu 8.10 (14 opisów) Gemma 31B wypadła na równi z droższymi modelami, ok. 0,05 $ za 1000 podziałów.
// Przed danymi teatrów ustaw AI_MODEL_SPLIT na model bez trenowania na danych (krok 5 redesignu).
const SPLIT_MODELS = (process.env.AI_MODEL_SPLIT ?? 'google/gemma-4-31b-it:free,google/gemma-4-31b-it')
    .split(',').map(m => m.trim()).filter(Boolean)

export type PropInput = {
    id?: string
    performanceId: string
    name: string
    description: string
    sceneNumber: number | null
    actNumber: number | null
    groupId: string | null
    castOnly: 'first' | 'second' | null
    /** Miejsce na liście wpisane ręcznie; puste = dopasuje model. */
    area: string | null
    /** Przedmiot z magazynu, gdy rekwizyt dobrano z podpowiedzi; przy edycji bez zmian. */
    itemId?: string | null
    /** Miejsce wskazane identyfikatorem sceny (edytor rozpiski); ma pierwszeństwo przed sceneNumber/actNumber. */
    target?: PropTarget
}

type Split = { prep: string | null; place: string | null; area: string | null }

const normalize = (s: string) => s.toLocaleLowerCase('pl').replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim()

/**
 * Dzieli swobodny opis na „jak” (przygotowanie) i „gdzie” (dokładne miejsce) i dobiera miejsce na liście
 * spośród istniejących w spektaklu. Model niczego nie dopisuje: przyjmujemy tylko fragmenty, które dosłownie
 * występują w opisie. Gdy model nie odpowie albo zmieni tekst, cały opis zostaje jako „jak”.
 */
async function splitDescription(description: string, areas: string[]): Promise<Split & { structured: boolean }> {
    const fallback = { prep: description, place: null, area: null, structured: false }
    if (!description.trim() || !isAIAvailable()) return fallback

    const prompt = `Jesteś asystentem pracowni rekwizytorskiej w teatrze. Podziel opis rekwizytu na dwie części:
- "prep": jak przygotować rzecz (stan, zawartość, co sprawdzić),
- "place": gdzie dokładnie ma leżeć albo kto ją wnosi.
Przepisz fragmenty DOSŁOWNIE z opisu, bez zmieniania słów, bez dopisywania czegokolwiek. Jeśli której części nie ma, daj null.
Dobierz też "area": ogólne miejsce na liście zadań. Wybierz jedno z istniejących: ${areas.length ? areas.map(a => `"${a}"`).join(', ') : '(brak)'}.
Jeśli żadne nie pasuje, daj null.

Opis: """${description}"""

Odpowiedz wyłącznie JSON: {"prep": string|null, "place": string|null, "area": string|null}`

    try {
        const response = await generateAI({ task: 'text', operation: 'prop_description_split', prompt, json: true, maxTokens: 400, models: SPLIT_MODELS })
        const result = parseAIJson<Split>(response.text)
        const desc = normalize(description)
        const literal = (s: string | null) => (s && desc.includes(normalize(s)) ? s.trim().replace(/[.,;:]+$/, '') : null)
        const prep = literal(result.prep)
        const place = literal(result.place)
        const area = result.area && areas.includes(result.area) ? result.area : null

        // Model zmienił tekst albo nic nie znalazł: zostaje opis człowieka.
        if ((result.prep && !prep) || (result.place && !place) || (!prep && !place)) return { ...fallback, area }

        return { prep, place, area, structured: true }
    } catch (error) {
        console.warn('Podział opisu nie powiódł się:', error)
        return fallback
    }
}

export async function savePerformanceProp(input: PropInput): Promise<{ ok: true; id: string; previous: PropRow | null } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }

    const name = input.name.trim()
    if (!name) return { ok: false, error: 'Wpisz nazwę rekwizytu, np. „Kielich srebrny”.' }

    const description = input.description.trim()

    const { data: areaRows } = await supabase
        .from('performance_props')
        .select('area')
        .eq('performance_id', input.performanceId)
        .not('area', 'is', null)
    const areas = [...new Set((areaRows ?? []).map(r => r.area as string))]

    // Opis bez zmian: nie pytamy modelu jeszcze raz.
    // Poprzednia wersja wiersza służy też do „Cofnij” po edycji.
    let previous: PropRow | null = null
    if (input.id) {
        const { data } = await supabase.from('performance_props').select('*').eq('id', input.id).single()
        previous = data
    }
    const split = previous && previous.description === description
        ? { prep: previous.prep, place: previous.place, area: previous.area, structured: !!previous.structured_at }
        : await splitDescription(description, areas)

    const row = {
        performance_id: input.performanceId,
        item_name: name,
        description: description || null,
        prep: description ? split.prep : null,
        place: description ? split.place : null,
        structured_at: split.structured ? new Date().toISOString() : null,
        area: input.area?.trim() || split.area || null,
        ...(input.target !== undefined
            ? await resolveTarget(supabase, input.target)
            : { scene_number: input.sceneNumber, act_number: input.actNumber }),
        group_id: input.groupId,
        ...(input.itemId !== undefined ? { item_id: input.itemId } : {}),
        cast_only: input.castOnly,
    }

    const { data, error } = input.id
        ? await supabase.from('performance_props').update(row).eq('id', input.id).select('id').single()
        : await supabase.from('performance_props').insert({ ...row, order: await nextOrder(supabase, input.performanceId) }).select('id').single()

    if (error || !data) return { ok: false, error: 'Nie udało się zapisać rekwizytu. Sprawdź połączenie i spróbuj jeszcze raz.' }

    revalidatePath(`/[locale]/performances/${input.performanceId}`, 'page')
    revalidatePath('/[locale]/lists/[id]', 'page')
    return { ok: true, id: data.id, previous }
}

type PropRow = Database['public']['Tables']['performance_props']['Row']

/** Miejsce w rozpisce wskazane identyfikatorem sceny (numery scen zmieniają się przy przestawianiu), aktem albo „bez sceny”. */
export type PropTarget = { sceneId: string } | { act: number } | null

async function resolveTarget(supabase: Awaited<ReturnType<typeof createClient>>, target: PropTarget) {
    if (target && 'sceneId' in target) {
        const { data, error } = await supabase.from('scenes').select('scene_number, act_number').eq('id', target.sceneId).single()
        if (error || !data) throw error ?? new Error('Nie ma takiej sceny')
        return { scene_number: data.scene_number, act_number: data.act_number }
    }
    if (target && 'act' in target) return { scene_number: null, act_number: target.act }
    return { scene_number: null, act_number: null }
}

/** Nowy rekwizyt staje na końcu rozpiski (w swojej scenie), także wtedy, gdy obok są wpisy z jawną kolejnością. */
async function nextOrder(supabase: Awaited<ReturnType<typeof createClient>>, performanceId: string) {
    const { data } = await supabase
        .from('performance_props')
        .select('order')
        .eq('performance_id', performanceId)
        .not('order', 'is', null)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle()
    return (data?.order ?? -1) + 1
}

const revalidateProps = (performanceId: string) => {
    revalidatePath(`/[locale]/performances/${performanceId}`, 'page')
    revalidatePath(`/[locale]/performances/${performanceId}/props`, 'page')
    revalidatePath('/[locale]/lists/[id]', 'page')
}

/**
 * Szybkie wpisywanie rozpiski: same nazwy, od razu w scenie albo w akcie. Opis i resztę uzupełnia się później
 * w oknie rekwizytu. Kolejność nadajemy jawnie, bo wklejona lista wchodzi jednym zapisem z tą samą datą.
 */
export async function addPropNames(
    performanceId: string,
    names: string[],
    target: PropTarget,
): Promise<{ ok: true; props: { id: string; name: string }[] } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }

    const clean = names.map(n => n.trim()).filter(Boolean)
    if (clean.length === 0) return { ok: true, props: [] }

    let place: { scene_number: number | null; act_number: number | null }
    try { place = await resolveTarget(supabase, target) } catch { return { ok: false, error: 'Tej sceny już nie ma. Odśwież stronę.' } }
    const start = await nextOrder(supabase, performanceId)

    const { data, error } = await supabase
        .from('performance_props')
        .insert(clean.map((name, i) => ({
            performance_id: performanceId,
            item_name: name,
            ...place,
            order: start + i,
        })))
        .select('id, item_name')
    if (error || !data) return { ok: false, error: 'Nie udało się dopisać rekwizytów. Sprawdź połączenie i spróbuj jeszcze raz.' }

    revalidateProps(performanceId)
    return { ok: true, props: data.map(p => ({ id: p.id, name: p.item_name })) }
}

/**
 * Przeniesienie rekwizytu (przeciąganie albo „Przenieś do…”): nowe miejsce i kolejność w nim. `slotOrder` to wszystkie
 * rekwizyty docelowego miejsca w nowej kolejności; dostają te same numery `order`, które już miały, tylko w nowym układzie.
 */
export async function movePerformanceProp(
    performanceId: string,
    propId: string,
    target: PropTarget,
    slotOrder: string[],
): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    try {
        const place = await resolveTarget(supabase, target)
        const { error: moveError } = await supabase.from('performance_props').update(place).eq('id', propId)
        if (moveError) throw moveError

        const ids = slotOrder.includes(propId) ? slotOrder : [...slotOrder, propId]
        const { data: rows, error } = await supabase.from('performance_props').select('id, order').in('id', ids)
        if (error) throw error
        const current = new Map((rows ?? []).map(r => [r.id, r.order]))
        const values = (rows ?? []).map(r => r.order).filter((n): n is number => n != null).sort((a, b) => a - b)
        let next = await nextOrder(supabase, performanceId)
        while (values.length < ids.length) values.push(next++)
        const updates = ids.flatMap((id, i) => current.get(id) === values[i] ? [] : [
            supabase.from('performance_props').update({ order: values[i] }).eq('id', id),
        ])
        const results = await Promise.all(updates)
        const failed = results.find(r => r.error)
        if (failed?.error) throw failed.error
    } catch (error) {
        console.error('movePerformanceProp:', error)
        return { ok: false, error: 'Nie udało się przenieść rekwizytu. Sprawdź połączenie i spróbuj jeszcze raz.' }
    }
    revalidateProps(performanceId)
    return { ok: true }
}

export async function renamePerformanceProp(id: string, performanceId: string, name: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const clean = name.trim()
    if (!clean) return { ok: false, error: 'Wpisz nazwę rekwizytu, np. „Kielich srebrny”.' }
    const { error } = await supabase.from('performance_props').update({ item_name: clean }).eq('id', id)
    if (error) return { ok: false, error: 'Nie udało się zmienić nazwy. Spróbuj jeszcze raz.' }
    revalidateProps(performanceId)
    return { ok: true }
}

/** Usuwa rekwizyt i oddaje cały wiersz, żeby „Cofnij” mogło go przywrócić bez zmian. */
export async function removePerformanceProp(id: string, performanceId: string): Promise<{ ok: true; row: PropRow } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const { data, error } = await supabase.from('performance_props').delete().eq('id', id).select('*').single()
    if (error || !data) return { ok: false, error: 'Nie udało się usunąć rekwizytu. Spróbuj jeszcze raz.' }
    revalidateProps(performanceId)
    return { ok: true, row: data }
}

/** Cofnięcie edycji: przywraca wiersz dokładnie w poprzedniej wersji (z podziałem opisu, bez pytania modelu). */
export async function revertPerformanceProp(row: PropRow): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const fields: Partial<PropRow> = { ...row }
    delete fields.id
    delete fields.created_at
    const { error } = await supabase.from('performance_props').update(fields).eq('id', row.id)
    if (error) return { ok: false, error: 'Nie udało się cofnąć zmiany.' }
    revalidateProps(row.performance_id)
    return { ok: true }
}

/** Cofnięcie dodania: usuwa świeżo dodane rekwizyty (także całą wklejoną listę naraz). */
export async function removePerformanceProps(ids: string[], performanceId: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    if (ids.length === 0) return { ok: true }
    const { error } = await supabase.from('performance_props').delete().in('id', ids)
    if (error) return { ok: false, error: 'Nie udało się cofnąć dodania.' }
    revalidateProps(performanceId)
    return { ok: true }
}

export async function restorePerformanceProp(row: PropRow): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const { error } = await supabase.from('performance_props').insert(row)
    if (error) return { ok: false, error: 'Nie udało się przywrócić rekwizytu.' }
    revalidateProps(row.performance_id)
    return { ok: true }
}

export async function deletePerformanceProp(id: string, performanceId: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const { error } = await supabase.from('performance_props').delete().eq('id', id)
    if (error) return { ok: false, error: 'Nie udało się usunąć rekwizytu. Spróbuj jeszcze raz.' }
    revalidatePath(`/[locale]/performances/${performanceId}`, 'page')
    return { ok: true }
}
