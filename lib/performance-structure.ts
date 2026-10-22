import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { roman, sceneCode, theatreDate } from './rk-format'

type PropRow = Database['public']['Tables']['performance_props']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type GroupRow = Database['public']['Tables']['groups']['Row']

export type GroupStatus = 'available' | 'in_repair' | 'loaned' | 'missing'
export type Stage = 'rehearsal' | 'preshow' | 'intermission' | 'postshow'

export type StructuredProp = {
    id: string
    name: string
    /** Opis wpisany przez człowieka (źródło prawdy) i czy model go już podzielił. */
    description: string | null
    structured: boolean
    /** „Jak”: podział z modelu albo cały opis, gdy podziału nie ma (POMYSLY 5). */
    how: string | null
    where: string | null
    /** „Skąd”: ścieżka w magazynie („Szafa B › półka 2”) albo nazwa grupy. */
    from: string | null
    area: string | null
    /** „Kto bierze” w trybie na żywo (postać albo osoba). */
    handler: string | null
    act: number | null
    scene: number | null
    code: string
    castOnly: string | null
    stages: Stage[] | null
    group: { id: string; name: string; status: GroupStatus; statusNote: string | null } | null
}

export type StructuredScene = { id: string; act: number; number: number; name: string; code: string; props: StructuredProp[] }
export type StructuredAct = { act: number; scenes: StructuredScene[]; actProps: StructuredProp[]; propCount: number }

export type PerformanceStructure = {
    preparation: StructuredScene[]
    acts: StructuredAct[]
    /** Rekwizyty bez sceny i aktu (np. dodane przed podziałem na sceny). */
    unassigned: StructuredProp[]
    props: StructuredProp[]
    actCount: number
    sceneCount: number
    /** Spektakl „tylko akty”: sceny zostają w danych, ale w interfejsie są ukryte. */
    actsOnly: boolean
}

type GroupWithLocation = Pick<GroupRow, 'id' | 'name' | 'status' | 'status_note'> & { locations: { name: string } | null }

export async function loadPerformanceStructure(
    supabase: SupabaseClient<Database>,
    performanceId: string
): Promise<PerformanceStructure> {
    const [scenesResult, propsResult, performanceResult] = await Promise.all([
        supabase.from('scenes').select('*').eq('performance_id', performanceId)
            .order('act_number', { ascending: true }).order('scene_number', { ascending: true }),
        supabase.from('performance_props').select('*').eq('performance_id', performanceId)
            .order('order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('performances').select('structure').eq('id', performanceId).maybeSingle(),
    ])
    const actsOnly = performanceResult.data?.structure === 'acts_only'
    const scenes = (scenesResult.data ?? []) as SceneRow[]
    const props = (propsResult.data ?? []) as PropRow[]

    const groupIds = [...new Set(props.map(p => p.group_id).filter((id): id is string => !!id))]
    const groups = groupIds.length
        ? ((await supabase.from('groups').select('id, name, status, status_note, locations(name)').in('id', groupIds)).data ?? []) as GroupWithLocation[]
        : []
    const groupById = new Map(groups.map(g => [g.id, g]))
    const sceneByNumber = new Map(scenes.map(s => [s.scene_number, s]))

    const structured: StructuredProp[] = props.map(p => {
        const scene = p.scene_number != null ? sceneByNumber.get(p.scene_number) : undefined
        const act = scene?.act_number ?? p.act_number ?? null
        const g = p.group_id ? groupById.get(p.group_id) : undefined
        return {
            id: p.id,
            name: p.item_name,
            description: p.description,
            structured: p.structured_at != null,
            how: p.prep ?? (p.place ? null : p.description),
            where: p.place,
            from: g ? [g.locations?.name, g.name].filter(Boolean).join(' › ') : null,
            area: p.area,
            handler: p.handler,
            act,
            scene: scene ? scene.scene_number : null,
            code: scene && !actsOnly ? sceneCode(act, sceneNumberInAct(scenes, scene)) : sceneCode(act),
            castOnly: p.cast_only,
            stages: (p.stages as Stage[] | null) ?? null,
            group: g ? { id: g.id, name: g.name, status: g.status as GroupStatus, statusNote: g.status_note } : null,
        }
    })

    const playable = scenes.filter(s => s.type !== 'intermission' && s.type !== 'preparation' && (s.act_number ?? 0) > 0)
    const toScene = (s: SceneRow): StructuredScene => ({
        id: s.id,
        act: s.act_number ?? 0,
        number: s.scene_number,
        name: s.name ?? '',
        code: sceneCode(s.act_number, s.type === 'preparation' ? null : sceneNumberInAct(scenes, s)),
        props: structured.filter(p => p.scene === s.scene_number),
    })

    const actNumbers = [...new Set([
        ...playable.map(s => s.act_number as number),
        ...structured.filter(p => p.scene == null && (p.act ?? 0) > 0).map(p => p.act as number),
    ])].sort((a, b) => a - b)

    const acts: StructuredAct[] = actNumbers.map(act => {
        const actScenes = playable.filter(s => s.act_number === act).map(toScene)
        const direct = structured.filter(p => p.scene == null && p.act === act)
        const propCount = direct.length + actScenes.reduce((n, s) => n + s.props.length, 0)
        // „Tylko akty”: rekwizyty ze scen stoją bezpośrednio pod nagłówkiem aktu, w kolejności rozpiski.
        if (actsOnly) {
            const all = structured.filter(p => p.act === act)
            return { act, scenes: [], actProps: all, propCount: all.length }
        }
        return { act, scenes: actScenes, actProps: direct, propCount }
    })

    // Płaska lista („Wszystkie rekwizyty”, eksport, podpowiedzi) w kolejności rozpiski: przygotowanie, potem akty
    // (najpierw rekwizyty całego aktu, potem sceny po kolei), na końcu „Bez sceny”. W obrębie miejsca kolejność z bazy.
    const position = (p: StructuredProp): [number, number, number] => {
        const scene = p.scene != null ? sceneByNumber.get(p.scene) : undefined
        if (scene && (scene.type === 'preparation' || (scene.act_number ?? 0) === 0)) return [0, 0, scene.scene_number]
        if (p.act != null && p.act > 0) return [1, p.act, scene ? scene.scene_number : -1]
        return [2, 0, 0]
    }
    const inBreakdownOrder = structured
        .map((p, i) => ({ p, i, k: position(p) }))
        .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2] || a.i - b.i)
        .map(x => x.p)

    return {
        preparation: scenes.filter(s => s.type === 'preparation' || s.act_number === 0).map(toScene),
        acts,
        actsOnly,
        unassigned: structured.filter(p => p.scene == null && p.act == null),
        props: inBreakdownOrder,
        actCount: acts.length,
        sceneCount: actsOnly ? 0 : playable.length,
    }
}

/**
 * Numery scen w bazie są ciągłe dla całego spektaklu; w interfejsie numerujemy w obrębie aktu („II.3”).
 * Pomijamy przerwy i przygotowanie.
 */
function sceneNumberInAct(all: SceneRow[], scene: SceneRow) {
    const inAct = all
        .filter(s => s.act_number === scene.act_number && s.type !== 'intermission' && s.type !== 'preparation')
        .sort((a, b) => a.scene_number - b.scene_number)
    const i = inAct.findIndex(s => s.id === scene.id)
    return i >= 0 ? i + 1 : scene.scene_number
}

/**
 * Etapy listy zadań (uzgodnione 7.10.2026):
 * - próba: wszystkie rekwizyty, tylko na liście próby;
 * - przed spektaklem: wszystkie;
 * - przed II aktem: rekwizyty aktów od II w górę (sprawdzane w przerwie);
 * - po spektaklu: rekwizyty powiązane z magazynem, do zwrotu.
 * performance_props.stages nadpisuje regułę dla pojedynczego rekwizytu.
 */
export function stagesFor(listKind: string, actCount: number): Stage[] {
    if (listKind === 'rehearsal') return ['rehearsal', 'postshow']
    return actCount > 1 ? ['preshow', 'intermission', 'postshow'] : ['preshow', 'postshow']
}

export function propInStage(prop: StructuredProp, stage: Stage) {
    if (prop.stages) return prop.stages.includes(stage)
    switch (stage) {
        case 'rehearsal':
        case 'preshow':
            return true
        case 'intermission':
            return (prop.act ?? 0) >= 2
        case 'postshow':
            return prop.group != null
    }
}

/** Rekwizyt pomijany dziś, bo jest tylko dla innej obsady. */
export const skippedForCast = (prop: StructuredProp, cast: string | null) =>
    prop.castOnly != null && cast != null && prop.castOnly !== cast

/** Rekwizyt blokuje gotowość, gdy jego grupa w magazynie nie jest na miejscu. */
export const isBlocking = (prop: StructuredProp) => prop.group != null && prop.group.status !== 'available'

export type StageProgress = { stage: Stage; done: number; total: number; complete: boolean }

/** Postęp etapów listy zadań; checked zawiera klucze `${stage}:${propId}`. */
export function listProgress(structure: PerformanceStructure, kind: string, cast: string | null, checked: Set<string>): StageProgress[] {
    return stagesFor(kind, structure.actCount).map(stage => {
        const props = structure.props.filter(p => propInStage(p, stage) && !skippedForCast(p, cast))
        const done = props.filter(p => checked.has(`${stage}:${p.id}`)).length
        return { stage, done, total: props.length, complete: props.length > 0 && done === props.length }
    })
}

/** Jak długo po godzinie rozpoczęcia lista jest w stanie „na żywo” (spektakl z przerwą). */
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000

/** Jak długo trwa tryb „na żywo” od startu (okno 4 h): od godziny spektaklu albo od ręcznego „Zaczynamy”. */
export const LIVE_WINDOW = LIVE_WINDOW_MS

/**
 * Stan „na żywo” włącza się sam o godzinie spektaklu (POMYSLY 7). Cichy przycisk „Zaczynamy” zapisuje
 * chwilę ręcznego startu w live_act_started_at (timestamptz); wtedy tryb działa też przed godziną z kalendarza.
 * Spóźniony start nie wyłącza trybu, tylko przesuwa zegar aktu.
 */
export function isLiveNow(kind: string, showDate: string, now: string, startedAt?: string | null) {
    if (kind !== 'show') return false
    const t = new Date(now).getTime()
    const start = new Date(showDate).getTime()
    if (t >= start && t < start + LIVE_WINDOW_MS) return true
    if (!startedAt) return false
    const manual = theatreDate(startedAt).getTime()
    return t >= manual && t < manual + LIVE_WINDOW_MS
}

/** Sceny grane po kolei (bez przygotowania i przerw), z aktem. */
export function playOrder(structure: PerformanceStructure): StructuredScene[] {
    if (!structure.actsOnly) return structure.acts.flatMap(a => a.scenes)
    // Spektakl „tylko akty”: tryb na żywo przełącza całe akty (numer „sceny” to numer aktu).
    return structure.acts.map(a => ({ id: `act-${a.act}`, act: a.act, number: a.act, name: '', code: roman(a.act), props: a.actProps }))
}
