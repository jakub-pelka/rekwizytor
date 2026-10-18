import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { notFound } from 'next/navigation'
import { PerformancePhone } from '@/components/performances/PerformancePhone'
import { PerformanceDesktop, type DesktopTerm } from '@/components/performances/PerformanceDesktop'
import { GROUP_STATUS, statusCountLabel } from '@/components/rk/GroupStatus'
import { listProgress, loadPerformanceStructure } from '@/lib/performance-structure'
import { theatreNowNaive } from '@/lib/rk-format'

type Props = {
    params: Promise<{ id: string }>
}


export default async function ProductionDetailsPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    // Map Supabase user to the shape expected by ExportPerformanceButton
    const user = supabaseUser ? {
        full_name: supabaseUser.user_metadata?.full_name || null,
        email: supabaseUser.email
    } : null

    // Execute all queries in parallel for ~3-5x faster loading
    const [
        productionResult,
        scenesResult,
        notesResult,
        allPropsResult,
        linkedGroupsResult
    ] = await Promise.all([
        // Performance details
        supabase
            .from('performances')
            .select('*')
            .eq('id', id)
            .single(),

        // Scenes for Act info - all fields needed for export
        supabase
            .from('scenes')
            .select('*')
            .eq('performance_id', id),

        // Notes for this performance - all fields needed for export
        supabase
            .from('notes')
            .select('*')
            .eq('performance_id', id)
            .order('is_master', { ascending: false })
            .order('updated_at', { ascending: false }),

        // All props for checklist and scene view
        supabase
            .from('performance_props')
            .select('*')
            .eq('performance_id', id)
            .order('order', { ascending: true })
            .order('created_at', { ascending: true }),

        // Groups linked to this performance
        supabase
            .from('groups')
            .select('*, locations(name)')
            .eq('performance_id', id)
            .order('created_at', { ascending: true })
    ])

    const production = productionResult.data
    const scenes = scenesResult.data
    const notes = notesResult.data
    const allProps = allPropsResult.data
    const linkedGroups = linkedGroupsResult.data


    if (!production) {
        notFound()
    }

    // Telefon: rozpiska z nowym modelem, terminy (listy zadań) od dziś i nowe wzmianki w notatkach.
    const nowNaive = theatreNowNaive()
    const [structure, listsResult, mentionsResult, groupsResult] = await Promise.all([
        loadPerformanceStructure(supabase, id),
        supabase
            .from('show_lists')
            .select('id, show_date, kind, cast, with_props')
            .eq('performance_id', id)
            .gte('show_date', nowNaive.slice(0, 10))
            .order('show_date', { ascending: true }),
        supabaseUser
            ? supabase
                .from('note_mentions')
                .select('id, note:notes!inner(performance_id)', { count: 'exact', head: true })
                .eq('mentioned_id', supabaseUser.id)
                .eq('note.performance_id', id)
            : Promise.resolve({ count: 0 }),
        supabaseUser
            ? supabase.from('groups').select('id, name, locations(name)').is('deleted_at', null).order('name')
            : Promise.resolve({ data: [] as { id: string; name: string; locations: { name: string } | null }[] }),
    ])
    const groupOptions = (groupsResult.data ?? []).map(g => ({
        id: g.id,
        label: [g.locations?.name, g.name].filter(Boolean).join(' › '),
    }))
    const upcomingLists = listsResult.data ?? []

    // Terminy od dziś z postępem pierwszego etapu (próba albo „przed spektaklem”), jak w kalendarzu.
    const listRows = upcomingLists.slice(0, 3)
    const { data: checkRows } = listRows.length
        ? await supabase.from('show_list_checks').select('show_list_id, performance_prop_id, stage').in('show_list_id', listRows.map(l => l.id))
        : { data: [] }
    const terms: DesktopTerm[] = listRows.map(l => {
        const checked = new Set((checkRows ?? []).filter(c => c.show_list_id === l.id).map(c => `${c.stage}:${c.performance_prop_id}`))
        const stage = l.kind === 'rehearsal' ? 'rehearsal' : 'preshow'
        const p = (l.with_props ?? true) && structure.props.length
            ? listProgress(structure, l.kind, l.cast, checked).find(x => x.stage === stage)
            : undefined
        return { id: l.id, showDate: l.show_date, kind: l.kind, cast: l.cast, progress: p ? { done: p.done, total: p.total } : null }
    })

    // Grupy spektaklu w magazynie: te, do których odsyłają rekwizyty rozpiski, i te przypisane do spektaklu wprost.
    const groupById = new Map<string, { status: string }>()
    for (const p of structure.props) if (p.group) groupById.set(p.group.id, { status: p.group.status })
    for (const g of linkedGroups ?? []) if (!g.deleted_at) groupById.set(g.id, { status: g.status })
    const groupStates = [...groupById.values()]
    const worstGroup = (['missing', 'loaned', 'in_repair'] as const).find(st => groupStates.some(g => g.status === st))

    return (
        <>
        <PerformancePhone
            performance={{ id, title: production.title, venue: production.venue }}
            structure={structure}
            lists={upcomingLists}
            currentListId={upcomingLists[0]?.id ?? null}
            notes={(notes ?? []).map(n => ({ id: n.id, title: n.title }))}
            newMentions={mentionsResult.count ?? 0}
            canEdit={access.canWrite}
            groups={groupOptions}
            now={nowNaive}
        />
        <PerformanceDesktop
            performance={{
                id,
                title: production.title,
                venue: production.venue,
                premiereDate: production.premiere_date,
                poster: production.image_url,
            }}
            structure={structure}
            nextTerm={terms[0] ?? null}
            laterTerms={terms.slice(1, 3)}
            related={{
                castExceptions: structure.props.filter(p => p.castOnly).length,
                groups: groupStates.length,
                groupAlert: worstGroup ? { label: statusCountLabel(worstGroup, groupStates.filter(g => g.status === worstGroup).length), tone: GROUP_STATUS[worstGroup].tone } : null,
                notes: notes?.length ?? 0,
                newMentions: mentionsResult.count ?? 0,
            }}
            canEdit={access.canWrite}
            groups={groupOptions}
            labelGroupIds={[...groupById.keys()]}
            now={nowNaive}
            exportData={{ production, items: allProps || [], scenes: scenes || [], notes: notes || [], user }}
        />
        </>
    )
}
