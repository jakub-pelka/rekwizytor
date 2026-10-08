import { createClient } from '@/utils/supabase/server'
import { PerformancesView, type ListedPerformance } from '@/components/performances/PerformancesView'
import type { GroupStatus } from '@/lib/performance-structure'
import { seasonOf, theatreNow, theatreNowNaive } from '@/lib/rk-format'

type Props = {
    readonly searchParams: Promise<{ season?: string; venue?: string }>
}

// Lista spektakli z plakatem (README, aktualizacja 8.10): telefon i komputer z jednego widoku.
export default async function PerformancesPage({ searchParams }: Props) {
    const params = await searchParams
    const archive = params.season === 'archive'
    const supabase = await createClient()
    const nowNaive = theatreNowNaive()

    const [performancesResult, listsResult, scenesResult, propsResult, userResult] = await Promise.all([
        supabase
            .from('performances')
            .select('id, title, status, premiere_date, thumbnail_url, image_url, venue, deleted_at')
            .is('deleted_at', null)
            .order('premiere_date', { ascending: false }),
        // select('*'): działa także przed migracją z kolumnami prób (note).
        supabase.from('show_lists').select('*').gte('show_date', nowNaive.slice(0, 10)).order('show_date', { ascending: true }),
        supabase.from('scenes').select('performance_id, act_number, type'),
        supabase.from('performance_props').select('performance_id, group_id, cast_only'),
        supabase.auth.getUser(),
    ])

    const performances = (performancesResult.data ?? []).filter(p => (archive ? p.status === 'archived' : p.status !== 'archived'))
    const scenes = scenesResult.data ?? []
    const props = propsResult.data ?? []

    const groupIds = [...new Set(props.map(p => p.group_id).filter((id): id is string => !!id))]
    const { data: groups } = groupIds.length
        ? await supabase.from('groups').select('id, status').in('id', groupIds)
        : { data: [] as { id: string; status: string }[] }
    const statusOf = new Map((groups ?? []).map(g => [g.id, g.status as GroupStatus]))

    type ListRow = { performance_id: string; show_date: string; kind: string; cast: string | null; note?: string | null }
    const nextByPerformance = new Map<string, ListRow>()
    for (const l of (listsResult.data ?? []) as ListRow[]) {
        if (!nextByPerformance.has(l.performance_id)) nextByPerformance.set(l.performance_id, l)
    }

    const listed: ListedPerformance[] = performances.map(p => {
        const own = scenes.filter(s => s.performance_id === p.id && s.type !== 'intermission' && s.type !== 'preparation' && (s.act_number ?? 0) > 0)
        const ownProps = props.filter(x => x.performance_id === p.id)
        const next = archive ? undefined : nextByPerformance.get(p.id)
        // Stan z magazynu, który zablokuje gotowość najbliższego terminu (bez rekwizytów innej obsady).
        const blocking = ownProps
            .filter(x => !(x.cast_only && next?.cast && x.cast_only !== next.cast))
            .map(x => (x.group_id ? statusOf.get(x.group_id) : undefined))
            .filter((s): s is Exclude<GroupStatus, 'available'> => !!s && s !== 'available')
        const worst = blocking.includes('missing') ? 'missing' : blocking.includes('loaned') ? 'loaned' : blocking[0]
        return {
            id: p.id,
            title: p.title,
            status: p.status,
            premiereDate: p.premiere_date,
            venue: p.venue,
            poster: p.thumbnail_url || p.image_url,
            acts: new Set(own.map(s => s.act_number)).size,
            scenes: own.length,
            props: ownProps.length,
            nextShow: next ? { date: next.show_date, kind: next.kind, cast: next.cast, note: next.note ?? null } : null,
            alert: worst ? { status: worst, count: blocking.filter(s => s === worst).length } : null,
        }
    })

    const venues = [...new Set(listed.map(p => p.venue).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'pl'))
    const venue = params.venue && venues.includes(params.venue) ? params.venue : null

    return (
        <PerformancesView
            performances={listed}
            venues={venues}
            venue={venue}
            seasonLabel={seasonOf(theatreNow()).label}
            archive={archive}
            canEdit={!!userResult.data.user}
            now={nowNaive}
        />
    )
}
