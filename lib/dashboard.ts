import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
    isBlocking, listProgress, loadPerformanceStructure, skippedForCast,
    type PerformanceStructure, type StageProgress, type StructuredProp,
} from './performance-structure'
import { theatreNowNaive } from './rk-format'

type Client = SupabaseClient<Database>

export type DashboardShow = {
    listId: string
    performanceId: string
    title: string
    venue: string | null
    showDate: string
    kind: string
    cast: string | null
    premiereDate: string | null
}

export type DashboardHero = DashboardShow & {
    progress: StageProgress[]
    blocking: StructuredProp[]
    crew: { id: string; name: string }[]
    /** Kiedy zamknięto poprzednią listę (próbę) tego spektaklu, jeśli była. */
    previousClosedAt: string | null
}

export type WeekRow = DashboardShow & { done: number; total: number; blocking: StructuredProp[] }

export type DashboardData = {
    hero: DashboardHero | null
    isToday: boolean
    week: WeekRow[]
    storage: {
        total: number
        locations: number
        inRepair: number
        loaned: number
        missing: { count: number; names: string[] }
        neededToday: number
    }
    activity: { id: string; who: { id: string; name: string } | null; prop: string; title: string; at: string }[]
    mentions: { id: string; noteId: string; noteTitle: string; at: string }[]
}

export async function loadDashboard(supabase: Client, userId: string | null): Promise<DashboardData> {
    const now = theatreNowNaive()
    const today = now.slice(0, 10)
    const weekEnd = new Date(new Date(today).getTime() + 7 * 86_400_000).toISOString().slice(0, 10)

    const [listsResult, groupsResult, activityResult, mentionsResult] = await Promise.all([
        supabase
            .from('show_lists')
            .select('id, performance_id, show_date, kind, cast, performance:performances!inner(id, title, venue, premiere_date, deleted_at)')
            .is('performance.deleted_at', null)
            .gte('show_date', today)
            .order('show_date', { ascending: true })
            .limit(12),
        supabase.from('groups').select('id, name, status, location_id').is('deleted_at', null),
        supabase
            .from('show_list_checks')
            .select('id, done_at, prop:performance_props(item_name), list:show_lists(performance:performances(title)), profile:profiles(id, full_name)')
            .order('done_at', { ascending: false })
            .limit(4),
        userId
            ? supabase.from('note_mentions').select('id, created_at, note:notes(id, title)').eq('mentioned_id', userId)
                .order('created_at', { ascending: false }).limit(2)
            : Promise.resolve({ data: [] as never[] }),
    ])

    const shows: DashboardShow[] = (listsResult.data ?? []).map(l => ({
        listId: l.id,
        performanceId: l.performance_id,
        title: l.performance.title,
        venue: l.performance.venue,
        showDate: l.show_date,
        kind: l.kind,
        cast: l.cast,
        premiereDate: l.performance.premiere_date,
    }))

    // Rozpiski spektakli z najbliższego tygodnia (jedna na spektakl) i odhaczenia ich list.
    const weekShows = shows.filter(s => s.showDate < weekEnd && s.kind === 'show')
    const heroShow = shows.find(s => s.kind === 'show') ?? null
    const performanceIds = [...new Set([...weekShows.map(s => s.performanceId), ...(heroShow ? [heroShow.performanceId] : [])])]
    const structures = new Map<string, PerformanceStructure>(
        await Promise.all(performanceIds.map(async id => [id, await loadPerformanceStructure(supabase, id)] as const))
    )
    const listIds = [...new Set([...weekShows.map(s => s.listId), ...(heroShow ? [heroShow.listId] : [])])]
    const { data: checks } = listIds.length
        ? await supabase.from('show_list_checks').select('show_list_id, performance_prop_id, stage, profile:profiles(id, full_name)').in('show_list_id', listIds)
        : { data: [] }
    const checkedByList = new Map<string, Set<string>>()
    for (const c of checks ?? []) {
        if (!checkedByList.has(c.show_list_id)) checkedByList.set(c.show_list_id, new Set())
        checkedByList.get(c.show_list_id)!.add(`${c.stage}:${c.performance_prop_id}`)
    }

    const activeBlocking = (s: DashboardShow) =>
        (structures.get(s.performanceId)?.props ?? []).filter(p => isBlocking(p) && !skippedForCast(p, s.cast))

    let hero: DashboardHero | null = null
    if (heroShow) {
        const structure = structures.get(heroShow.performanceId)!
        const crewMap = new Map<string, string>()
        for (const c of checks ?? []) {
            if (c.show_list_id === heroShow.listId && c.profile) crewMap.set(c.profile.id, c.profile.full_name ?? '')
        }
        const { data: previous } = await supabase
            .from('show_lists')
            .select('id, show_date')
            .eq('performance_id', heroShow.performanceId)
            .lt('show_date', heroShow.showDate)
            .order('show_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        const { data: lastCheck } = previous
            ? await supabase.from('show_list_checks').select('done_at').eq('show_list_id', previous.id)
                .order('done_at', { ascending: false }).limit(1).maybeSingle()
            : { data: null }
        hero = {
            ...heroShow,
            progress: listProgress(structure, heroShow.kind, heroShow.cast, checkedByList.get(heroShow.listId) ?? new Set()),
            blocking: activeBlocking(heroShow),
            crew: [...crewMap.entries()].map(([id, name]) => ({ id, name })),
            previousClosedAt: lastCheck?.done_at ?? null,
        }
    }

    const week: WeekRow[] = weekShows.map(s => {
        const preshow = listProgress(structures.get(s.performanceId)!, s.kind, s.cast, checkedByList.get(s.listId) ?? new Set())
            .find(p => p.stage === 'preshow')
        return { ...s, done: preshow?.done ?? 0, total: preshow?.total ?? 0, blocking: activeBlocking(s) }
    })

    const groups = groupsResult.data ?? []
    const todayShows = shows.filter(s => s.showDate.slice(0, 10) === today)
    const neededToday = new Set(todayShows.flatMap(s => activeBlocking(s).filter(p => p.group?.status === 'in_repair').map(p => p.group!.id)))
    const missing = groups.filter(g => g.status === 'missing')

    type ActivityRow = { id: string; done_at: string; prop: { item_name: string } | null; list: { performance: { title: string } | null } | null; profile: { id: string; full_name: string | null } | null }
    type MentionRow = { id: string; created_at: string; note: { id: string; title: string } | null }

    return {
        hero,
        isToday: !!hero && hero.showDate.slice(0, 10) === today,
        week,
        storage: {
            total: groups.length,
            locations: new Set(groups.map(g => g.location_id).filter(Boolean)).size,
            inRepair: groups.filter(g => g.status === 'in_repair').length,
            loaned: groups.filter(g => g.status === 'loaned').length,
            missing: { count: missing.length, names: missing.map(g => g.name) },
            neededToday: neededToday.size,
        },
        activity: ((activityResult.data ?? []) as unknown as ActivityRow[]).map(a => ({
            id: a.id,
            who: a.profile ? { id: a.profile.id, name: a.profile.full_name ?? '' } : null,
            prop: a.prop?.item_name ?? '',
            title: a.list?.performance?.title ?? '',
            at: a.done_at,
        })),
        mentions: ((mentionsResult.data ?? []) as unknown as MentionRow[]).filter(m => m.note).map(m => ({
            id: m.id, noteId: m.note!.id, noteTitle: m.note!.title, at: m.created_at,
        })),
    }
}
