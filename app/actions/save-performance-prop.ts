'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { generateAI, isAIAvailable, logAIUsage, parseAIJson } from '@/utils/ai/client'

// Podział opisu: najpierw darmowy model z OpenRouter, płatny tani jako zapas (limity darmowych modeli).
// Przed danymi teatrów ustaw AI_MODEL_SPLIT na model bez trenowania na danych (krok 5 redesignu).
const SPLIT_MODELS = (process.env.AI_MODEL_SPLIT ?? 'google/gemma-4-31b-it:free,google/gemini-3.5-flash-lite')
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
        const response = await generateAI({ task: 'text', prompt, json: true, maxTokens: 400, models: SPLIT_MODELS })
        const result = parseAIJson<Split>(response.text)
        const desc = normalize(description)
        const literal = (s: string | null) => (s && desc.includes(normalize(s)) ? s.trim().replace(/[.,;:]+$/, '') : null)
        const prep = literal(result.prep)
        const place = literal(result.place)
        const area = result.area && areas.includes(result.area) ? result.area : null

        // Model zmienił tekst albo nic nie znalazł: zostaje opis człowieka.
        if ((result.prep && !prep) || (result.place && !place) || (!prep && !place)) return { ...fallback, area }

        const supabase = await createClient()
        await logAIUsage(supabase, response, 'prop_description_split')
        return { prep, place, area, structured: true }
    } catch (error) {
        console.warn('Podział opisu nie powiódł się:', error)
        return fallback
    }
}

export async function savePerformanceProp(input: PropInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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
    let previous: { description: string | null; prep: string | null; place: string | null; area: string | null; structured_at: string | null } | null = null
    if (input.id) {
        const { data } = await supabase.from('performance_props').select('description, prep, place, area, structured_at').eq('id', input.id).single()
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
        scene_number: input.sceneNumber,
        act_number: input.actNumber,
        group_id: input.groupId,
        cast_only: input.castOnly,
    }

    const { data, error } = input.id
        ? await supabase.from('performance_props').update(row).eq('id', input.id).select('id').single()
        : await supabase.from('performance_props').insert(row).select('id').single()

    if (error || !data) return { ok: false, error: 'Nie udało się zapisać rekwizytu. Sprawdź połączenie i spróbuj jeszcze raz.' }

    revalidatePath(`/[locale]/performances/${input.performanceId}`, 'page')
    revalidatePath('/[locale]/lists/[id]', 'page')
    return { ok: true, id: data.id }
}

export async function deletePerformanceProp(id: string, performanceId: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zmieniać rozpiskę.' }
    const { error } = await supabase.from('performance_props').delete().eq('id', id)
    if (error) return { ok: false, error: 'Nie udało się usunąć rekwizytu. Spróbuj jeszcze raz.' }
    revalidatePath(`/[locale]/performances/${performanceId}`, 'page')
    return { ok: true }
}
