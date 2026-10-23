import { notFound, redirect } from 'next/navigation'
import { getAccess } from '@/lib/access'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { isLiveNow, loadPerformanceStructure } from '@/lib/performance-structure'
import { theatreNowNaive } from '@/lib/rk-format'
import { ShowListView, type ListCheck } from '@/components/lists/ShowListView'

type Props = {
    readonly params: Promise<{ readonly id: string }>
    readonly searchParams: Promise<{ view?: string }>
}

// Lista zadań na termin: etapy, rekwizyty pogrupowane po miejscu, odhaczanie (show_lists, show_list_checks).
export default async function ShowListPage({ params, searchParams }: Props) {
    const { id } = await params
    const { view } = await searchParams
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)

    const { data: list } = await supabase
        .from('show_lists')
        .select('id, performance_id, show_date, kind, cast, live_act_started_at, live_ended_at, performance:performances(id, title, venue)')
        .eq('id', id)
        .single()

    if (!list || !list.performance) notFound()

    // O godzinie spektaklu lista sama przechodzi w stan „na żywo”; ?view=list pokazuje całą listę.
    if (view !== 'list' && isLiveNow(list.kind, list.show_date, theatreNowNaive(), list.live_act_started_at, list.live_ended_at)) redirect(`/${await getLocale()}/lists/${id}/live`)

    const [structure, checksResult, nextListResult] = await Promise.all([
        loadPerformanceStructure(supabase, list.performance_id),
        supabase.from('show_list_checks').select('performance_prop_id, stage, done_by, profile:profiles(id, full_name, role)').eq('show_list_id', id),
        // Następny spektakl w kolejce: po spektaklu można już przygotować część rzeczy na kolejny termin.
        supabase
            .from('show_lists')
            .select('id, performance_id, show_date, kind, cast, performance:performances(id, title)')
            .gt('show_date', list.show_date)
            .eq('kind', 'show')
            .order('show_date', { ascending: true })
            .limit(1)
            .maybeSingle(),
    ])

    // „W kulisach”: kto odhacza tę listę i ile.
    type CheckRow = { performance_prop_id: string; stage: string; done_by: string | null; profile: { id: string; full_name: string | null; role: string | null } | null }
    const checkRows = (checksResult.data ?? []) as unknown as CheckRow[]
    const crewMap = new Map<string, { id: string; name: string; role: string | null; count: number }>()
    for (const c of checkRows) {
        if (!c.profile) continue
        const entry = crewMap.get(c.profile.id) ?? { id: c.profile.id, name: c.profile.full_name ?? '', role: c.profile.role, count: 0 }
        entry.count++
        crewMap.set(c.profile.id, entry)
    }
    const crew = [...crewMap.values()].sort((a, b) => b.count - a.count)

    const nextList = nextListResult.data
    const [nextStructure, nextChecksResult] = nextList
        ? await Promise.all([
            nextList.performance_id === list.performance_id
                ? Promise.resolve(structure)
                : loadPerformanceStructure(supabase, nextList.performance_id),
            supabase.from('show_list_checks').select('performance_prop_id, stage').eq('show_list_id', nextList.id),
        ])
        : [null, null]

    return (
        <ShowListView
            list={{ id: list.id, showDate: list.show_date, kind: list.kind, cast: list.cast, startedAt: list.live_act_started_at, endedAt: list.live_ended_at }}
            performance={list.performance}
            structure={structure}
            initialChecks={checkRows.map(c => ({ performance_prop_id: c.performance_prop_id, stage: c.stage }))}
            crew={crew}
            next={nextList && nextStructure ? {
                list: { id: nextList.id, showDate: nextList.show_date, kind: nextList.kind, cast: nextList.cast },
                title: nextList.performance?.title ?? '',
                structure: nextStructure,
                checks: (nextChecksResult?.data ?? []) as ListCheck[],
            } : null}
            canEdit={access.canWrite}
            now={theatreNowNaive()}
        />
    )
}
