'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Edycja aktów i scen spektaklu. Rekwizyt jest przypięty do sceny jej numerem (performance_props.scene_number),
// a numery scen są ciągłe dla całego spektaklu (Wesele: 0 przygotowanie, 1–15 sceny). Dlatego każda zmiana
// kolejności przenumerowuje sceny i przepina rekwizyty, żeby żaden nie wylądował w cudzej scenie.

export type EditorScene = { id: string; act: number; name: string }
type Result = { ok: true; scenes: EditorScene[] } | { ok: false; error: string; detail?: string }

type SceneRow = { id: string; act_number: number | null; scene_number: number; name: string | null; type: string | null }

const isPrep = (s: SceneRow) => s.type === 'preparation' || (s.act_number ?? 0) === 0
const isBreak = (s: SceneRow) => s.type === 'intermission'

/** Numery tymczasowe przy przenumerowaniu; wyżej niż 1_000_000, którym oznaczamy scenę właśnie dodaną na koniec aktu. */
const TEMP_OFFSET = 2_000_000

const AUTH_ERROR = 'Zaloguj się, żeby zmieniać podział spektaklu.'
const SAVE_ERROR = 'Nie udało się zapisać zmian w scenach. Sprawdź połączenie i spróbuj jeszcze raz.'

async function client() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user ? supabase : null
}
type Supabase = NonNullable<Awaited<ReturnType<typeof client>>>

async function loadScenes(supabase: Supabase, performanceId: string) {
    const { data, error } = await supabase.from('scenes')
        .select('id, act_number, scene_number, name, type')
        .eq('performance_id', performanceId)
        .order('act_number', { ascending: true }).order('scene_number', { ascending: true })
    if (error) throw error
    return (data ?? []) as SceneRow[]
}

const toEditor = (rows: SceneRow[]): EditorScene[] => rows
    .filter(s => !isPrep(s) && !isBreak(s))
    .sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0) || a.scene_number - b.scene_number)
    .map(s => ({ id: s.id, act: s.act_number ?? 1, name: s.name ?? '' }))

/**
 * Układa numery od nowa: przygotowanie zostaje, sceny aktów idą po kolei (w kolejności `order`, jeśli podana),
 * przerwa (stary wiersz sceny) zawsze na końcu swojego aktu. Rekwizyty dostają nowy numer i akt swojej sceny.
 */
async function renumber(supabase: Supabase, performanceId: string, order?: string[]) {
    const rows = await loadScenes(supabase, performanceId)
    const prep = rows.filter(isPrep)
    const rest = rows.filter(s => !isPrep(s))
    const rank = new Map(order?.map((id, i) => [id, i]))
    const acts = [...new Set(rest.map(s => s.act_number ?? 1))].sort((a, b) => a - b)

    let next = prep.length > 0 ? Math.max(...prep.map(s => s.scene_number)) + 1 : 1
    const changed = new Map<number, { number: number; act: number }>()
    const updates: SceneRow[] = []

    for (const act of acts) {
        const inAct = rest.filter(s => (s.act_number ?? 1) === act)
        const scenes = inAct.filter(s => !isBreak(s)).sort((a, b) =>
            (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.scene_number - b.scene_number)
        for (const s of [...scenes, ...inAct.filter(isBreak)]) {
            const number = next++
            if (!changed.has(s.scene_number)) changed.set(s.scene_number, { number, act })
            if (s.scene_number !== number || s.act_number !== act) updates.push({ ...s, scene_number: number, act_number: act })
        }
    }
    if (updates.length === 0) return

    const { data: props, error: propsError } = await supabase.from('performance_props')
        .select('id, scene_number, act_number')
        .eq('performance_id', performanceId)
        .not('scene_number', 'is', null)
    if (propsError) throw propsError
    const movedProps = (props ?? []).flatMap(p => {
        const target = changed.get(p.scene_number as number)
        if (!target || (target.number === p.scene_number && target.act === p.act_number)) return []
        return [{ id: p.id, ...target }]
    })

    // Dwa etapy, bo przy zamianie scen dwie miałyby chwilowo ten sam numer (unikalność numeru sceny w spektaklu).
    // Najpierw sceny i ich rekwizyty dostają numery tymczasowe (TEMP_OFFSET + docelowy), potem docelowe. Numery
    // tymczasowe zachowują docelową kolejność, więc przerwany drugi etap dokończy następne przenumerowanie.
    // Sceny przed rekwizytami w każdym etapie: rekwizyt nigdy nie wskazuje numeru, którego żadna scena jeszcze nie ma
    // dłużej niż na czas jednego kroku.
    const step = async (sceneNumber: (n: number) => number) => {
        const scenesDone = await Promise.all(updates.map(s => supabase.from('scenes')
            .update({ scene_number: sceneNumber(s.scene_number), act_number: s.act_number }).eq('id', s.id)))
        const sceneFail = scenesDone.find(r => r.error)
        if (sceneFail?.error) throw sceneFail.error
        const propsDone = await Promise.all(movedProps.map(p => supabase.from('performance_props')
            .update({ scene_number: sceneNumber(p.number), act_number: p.act }).eq('id', p.id)))
        const propFail = propsDone.find(r => r.error)
        if (propFail?.error) throw propFail.error
    }
    await step(n => TEMP_OFFSET + n)
    await step(n => n)
}

async function done(supabase: Supabase, performanceId: string): Promise<Result> {
    revalidatePath(`/[locale]/performances/${performanceId}`, 'page')
    revalidatePath('/[locale]/lists/[id]', 'page')
    return { ok: true, scenes: toEditor(await loadScenes(supabase, performanceId)) }
}

async function run(performanceId: string, work: (supabase: Supabase) => Promise<void>): Promise<Result> {
    const supabase = await client()
    if (!supabase) return { ok: false, error: AUTH_ERROR }
    try {
        await work(supabase)
        return await done(supabase, performanceId)
    } catch (error) {
        console.error('Scenes:', error)
        // W trybie deweloperskim szczegół trafia też do konsoli przeglądarki (sam komunikat dla ludzi jest ogólny).
        const detail = process.env.NODE_ENV !== 'production'
            ? JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))
            : undefined
        return { ok: false, error: SAVE_ERROR, detail }
    }
}

/** Nowa scena na końcu aktu (nowy akt powstaje razem ze swoją pierwszą sceną). */
export async function addScene(performanceId: string, act: number, name: string) {
    return run(performanceId, async supabase => {
        const { error } = await supabase.from('scenes').insert({
            performance_id: performanceId, act_number: act, scene_number: 1_000_000, name: name.trim(), type: 'scene',
        })
        if (error) throw error
        await renumber(supabase, performanceId)
    })
}

export async function renameScene(performanceId: string, id: string, name: string) {
    return run(performanceId, async supabase => {
        const { error } = await supabase.from('scenes').update({ name: name.trim() }).eq('id', id)
        if (error) throw error
    })
}

/** Nowa kolejność scen; `act` przenosi scenę do innego aktu (razem z jej rekwizytami). */
export async function saveSceneOrder(performanceId: string, scenes: { id: string; act: number }[]) {
    return run(performanceId, async supabase => {
        const rows = await loadScenes(supabase, performanceId)
        const moved = scenes.filter(s => rows.find(r => r.id === s.id)?.act_number !== s.act)
        for (const s of moved) {
            const { error } = await supabase.from('scenes').update({ act_number: s.act }).eq('id', s.id)
            if (error) throw error
        }
        await renumber(supabase, performanceId, scenes.map(s => s.id))
    })
}

/** Usuwa scenę; jej rekwizyty zostają w tym samym akcie, bez sceny. */
export async function deleteScene(performanceId: string, id: string) {
    return run(performanceId, async supabase => {
        const scene = (await loadScenes(supabase, performanceId)).find(s => s.id === id)
        if (!scene) return
        const { error: propsError } = await supabase.from('performance_props')
            .update({ scene_number: null, act_number: scene.act_number })
            .eq('performance_id', performanceId).eq('scene_number', scene.scene_number)
        if (propsError) throw propsError
        const { error } = await supabase.from('scenes').delete().eq('id', id)
        if (error) throw error
        await renumber(supabase, performanceId)
    })
}

/**
 * Usuwa akt z jego scenami. Rekwizyty aktu trafiają do „Bez sceny”, nic nie znika.
 * Dalsze akty przesuwają się o jeden (akt III staje się II).
 */
export async function deleteAct(performanceId: string, act: number) {
    return run(performanceId, async supabase => {
        const { error: propsError } = await supabase.from('performance_props')
            .update({ scene_number: null, act_number: null })
            .eq('performance_id', performanceId).eq('act_number', act)
        if (propsError) throw propsError
        const { error } = await supabase.from('scenes').delete().eq('performance_id', performanceId).eq('act_number', act)
        if (error) throw error

        const [{ data: laterScenes }, { data: laterProps }] = await Promise.all([
            supabase.from('scenes').select('id, act_number').eq('performance_id', performanceId).gt('act_number', act),
            supabase.from('performance_props').select('id, act_number').eq('performance_id', performanceId).gt('act_number', act),
        ])
        const shifted = await Promise.all([
            ...(laterScenes ?? []).map(s => supabase.from('scenes').update({ act_number: (s.act_number as number) - 1 }).eq('id', s.id)),
            ...(laterProps ?? []).map(p => supabase.from('performance_props').update({ act_number: (p.act_number as number) - 1 }).eq('id', p.id)),
        ])
        const failed = shifted.find(r => r.error)
        if (failed?.error) throw failed.error
        await renumber(supabase, performanceId)
    })
}

/** Porządkuje numery po imporcie scen ze zdjęcia rozpiski (model numeruje od 1 w każdym akcie). */
export async function normalizeScenes(performanceId: string) {
    return run(performanceId, supabase => renumber(supabase, performanceId))
}

/**
 * Zamienia miejscami dwa sąsiednie akty (np. II z III) razem ze scenami i rekwizytami, potem przenumerowuje sceny.
 */
export async function swapActs(performanceId: string, a: number, b: number) {
    return run(performanceId, async supabase => {
        const TEMP_ACT = -1
        for (const [from, to] of [[a, TEMP_ACT], [b, a], [TEMP_ACT, b]] as const) {
            const [scenes, props] = await Promise.all([
                supabase.from('scenes').update({ act_number: to }).eq('performance_id', performanceId).eq('act_number', from),
                supabase.from('performance_props').update({ act_number: to }).eq('performance_id', performanceId).eq('act_number', from),
            ])
            if (scenes.error) throw scenes.error
            if (props.error) throw props.error
        }
        await renumber(supabase, performanceId)
    })
}

/**
 * „Cofnij” po usunięciu sceny: wstawia ją z powrotem na to samo miejsce w akcie i przypina do niej rekwizyty,
 * które wtedy zostały w akcie bez sceny.
 */
export async function restoreScene(performanceId: string, scene: { name: string; act: number; index: number }, propIds: string[]) {
    return run(performanceId, async supabase => {
        const { data: inserted, error } = await supabase.from('scenes').insert({
            performance_id: performanceId, act_number: scene.act, scene_number: 1_000_000, name: scene.name, type: 'scene',
        }).select('id').single()
        if (error || !inserted) throw error ?? new Error('restoreScene')

        const current = toEditor(await loadScenes(supabase, performanceId)).filter(s => s.id !== inserted.id)
        const inAct = current.filter(s => s.act === scene.act)
        inAct.splice(Math.min(scene.index, inAct.length), 0, { id: inserted.id, act: scene.act, name: scene.name })
        const order = [...new Set([...current.map(s => s.act), scene.act])].sort((x, y) => x - y)
            .flatMap(act => act === scene.act ? inAct : current.filter(s => s.act === act))
        await renumber(supabase, performanceId, order.map(s => s.id))

        if (propIds.length > 0) {
            const row = (await loadScenes(supabase, performanceId)).find(s => s.id === inserted.id)
            if (!row) return
            const { error: propsError } = await supabase.from('performance_props')
                .update({ scene_number: row.scene_number, act_number: row.act_number })
                .in('id', propIds)
            if (propsError) throw propsError
        }
    })
}
