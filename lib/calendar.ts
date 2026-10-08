import type { SupabaseClient } from '@supabase/supabase-js'
import {
    addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek,
} from 'date-fns'
import type { Database } from '@/types/supabase'
import { isBlocking, listProgress, loadPerformanceStructure, skippedForCast, type GroupStatus, type PerformanceStructure } from './performance-structure'

type Client = SupabaseClient<Database>

export type CalendarView = 'list' | 'month'
export type CalendarKind = 'all' | 'show' | 'rehearsal'

export type CalendarTerm = {
    id: string
    performanceId: string
    performanceTitle: string
    kind: 'show' | 'rehearsal'
    /** Czas lokalny teatru bez strefy: „2026-10-09T19:00:00”. */
    showDate: string
    day: string
    termTitle: string | null
    venue: string | null
    note: string | null
    cast: string | null
    withProps: boolean
    premiere: boolean
    progress: { done: number; total: number } | null
    alert: { status: Exclude<GroupStatus, 'available'>; count: number } | null
}

const WEEK = { weekStartsOn: 1 as const }
const DAY = 'yyyy-MM-dd'

/** Zakres widoku: lista to 7 dni od wybranego dnia, miesiąc to pełne tygodnie od poniedziałku. */
export function calendarRange(view: CalendarView, anchor: Date) {
    if (view === 'month') {
        const from = startOfWeek(startOfMonth(anchor), WEEK)
        const to = endOfWeek(endOfMonth(anchor), WEEK)
        return { from, to, days: eachDayOfInterval({ start: from, end: to }) }
    }
    const to = addDays(anchor, 6)
    return { from: anchor, to, days: eachDayOfInterval({ start: anchor, end: to }) }
}

/** Poprzedni i następny okres dla strzałek nawigacji. */
export function shiftAnchor(view: CalendarView, anchor: Date, dir: -1 | 1) {
    return view === 'month' ? startOfMonth(addMonths(anchor, dir)) : addDays(anchor, 7 * dir)
}

export function parseAnchor(raw: string | undefined, today: Date) {
    const d = raw ? parseISO(raw) : today
    return isValid(d) ? d : today
}

export const dayKey = (d: Date) => format(d, DAY)

export async function loadCalendar(supabase: Client, from: Date, to: Date): Promise<CalendarTerm[]> {
    // select('*'), żeby kalendarz działał też przed migracją z kolumnami prób (title, venue, note, with_props).
    const { data } = await supabase
        .from('show_lists')
        .select('*, performance:performances!inner(id, title, venue, premiere_date, deleted_at)')
        .is('performance.deleted_at', null)
        .gte('show_date', dayKey(from))
        .lt('show_date', dayKey(addDays(to, 1)))
        .order('show_date', { ascending: true })

    type Row = Database['public']['Tables']['show_lists']['Row'] & {
        performance: { id: string; title: string; venue: string | null; premiere_date: string | null }
    }
    const rows = (data ?? []) as unknown as Row[]

    const ids = [...new Set(rows.map(r => r.performance_id))]
    const structures = new Map<string, PerformanceStructure>(
        await Promise.all(ids.map(async id => [id, await loadPerformanceStructure(supabase, id)] as const)),
    )
    const listIds = rows.map(r => r.id)
    const { data: checks } = listIds.length
        ? await supabase.from('show_list_checks').select('show_list_id, performance_prop_id, stage').in('show_list_id', listIds)
        : { data: [] }
    const checked = new Map<string, Set<string>>()
    for (const c of checks ?? []) {
        if (!checked.has(c.show_list_id)) checked.set(c.show_list_id, new Set())
        checked.get(c.show_list_id)!.add(`${c.stage}:${c.performance_prop_id}`)
    }

    return rows.map(r => {
        const kind = r.kind === 'rehearsal' ? 'rehearsal' : 'show'
        const withProps = r.with_props ?? true
        const structure = structures.get(r.performance_id)!
        // Licznik pokazuje etap, od którego zaczyna się praca: próba albo „przed spektaklem”.
        const stage = kind === 'rehearsal' ? 'rehearsal' : 'preshow'
        const p = withProps && structure.props.length
            ? listProgress(structure, r.kind, r.cast, checked.get(r.id) ?? new Set()).find(x => x.stage === stage)
            : undefined
        const blocking = structure.props.filter(x => isBlocking(x) && !skippedForCast(x, r.cast))
        const worst = blocking.find(x => x.group?.status === 'missing') ?? blocking.find(x => x.group?.status === 'loaned') ?? blocking[0]
        const status = worst?.group?.status as Exclude<GroupStatus, 'available'> | undefined
        return {
            id: r.id,
            performanceId: r.performance_id,
            performanceTitle: r.performance.title,
            kind,
            showDate: r.show_date,
            day: r.show_date.slice(0, 10),
            termTitle: r.title ?? null,
            venue: r.venue ?? r.performance.venue,
            note: r.note ?? null,
            cast: r.cast,
            withProps,
            premiere: kind === 'show' && r.performance.premiere_date === r.show_date.slice(0, 10),
            progress: p ? { done: p.done, total: p.total } : null,
            alert: status && withProps ? { status, count: blocking.filter(x => x.group?.status === status).length } : null,
        }
    })
}
