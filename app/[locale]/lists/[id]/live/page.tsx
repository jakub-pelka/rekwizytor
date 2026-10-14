import { notFound } from 'next/navigation'
import { getAccess } from '@/lib/access'
import { createClient } from '@/utils/supabase/server'
import { loadPerformanceStructure } from '@/lib/performance-structure'
import { theatreNowNaive } from '@/lib/rk-format'
import { LiveView, type LiveCheck, type LiveReport } from '@/components/lists/LiveView'

type Props = { readonly params: Promise<{ readonly id: string }> }

// Lista zadań w stanie „na żywo” (karta NaZywo): bieżąca scena, potwierdzenia podania, zgłoszenia.
export default async function LiveListPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const access = await getAccess(supabase)

    const { data: list } = await supabase
        .from('show_lists')
        .select('id, performance_id, show_date, kind, cast, live_scene_number, live_act_started_at, performance:performances(id, title, venue)')
        .eq('id', id)
        .single()
    if (!list || !list.performance) notFound()

    const [structure, checksResult, reportsResult, userResult] = await Promise.all([
        loadPerformanceStructure(supabase, list.performance_id),
        supabase.from('show_list_checks')
            .select('performance_prop_id, stage, done_at, profile:profiles(id, full_name, role)')
            .eq('show_list_id', id),
        supabase.from('show_list_reports')
            .select('id, message, scene_number, created_at, resolved_at, performance_prop_id, profile:profiles(id, full_name)')
            .eq('show_list_id', id)
            .is('resolved_at', null)
            .order('created_at', { ascending: false }),
        supabase.auth.getUser(),
    ])

    type CheckRow = { performance_prop_id: string; stage: string; done_at: string; profile: { id: string; full_name: string | null; role: string | null } | null }
    const checks = (checksResult.data ?? []) as unknown as CheckRow[]

    const crew = new Map<string, { id: string; name: string; role: string | null }>()
    for (const c of checks) if (c.profile) crew.set(c.profile.id, { id: c.profile.id, name: c.profile.full_name ?? '', role: c.profile.role })

    return (
        <LiveView
            list={{
                id: list.id,
                showDate: list.show_date,
                cast: list.cast,
                sceneNumber: list.live_scene_number,
                actStartedAt: list.live_act_started_at,
            }}
            performance={list.performance}
            structure={structure}
            initialChecks={checks.filter(c => c.stage === 'live').map<LiveCheck>(c => ({
                propId: c.performance_prop_id,
                at: c.done_at,
                by: c.profile ? { id: c.profile.id, name: c.profile.full_name ?? '' } : null,
            }))}
            initialReports={(reportsResult.data ?? []) as unknown as LiveReport[]}
            crew={[...crew.values()]}
            userId={userResult.data.user?.id ?? null}
            canWrite={access.canWrite}
            now={theatreNowNaive()}
        />
    )
}
