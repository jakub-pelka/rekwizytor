import { createClient } from '@/utils/supabase/server'
import { Plus, Layers } from 'lucide-react'
import Link from 'next/link'
import { PerformancesList } from '@/components/performances/PerformancesList'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/ui/PageHeader'

import { PerformancesListActions } from '@/components/performances/PerformancesListActions'
import { buttonVariants } from '@/components/ui/button-variants'
import { PerformancesPhone, type PhonePerformance } from '@/components/performances/PerformancesPhone'
import { seasonOf, theatreNow, theatreNowNaive } from '@/lib/rk-format'

type Props = {
    readonly searchParams: Promise<{ season?: string }>
}

export default async function PerformancesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const t = await getTranslations('Performances')
    const archive = (await searchParams).season === 'archive'

    // Parallel queries for better performance
    const [performancesResult, scheduledShowsResult, upcomingListsResult, userResult] = await Promise.all([
        supabase
            .from('performances')
            .select('id, title, status, premiere_date, thumbnail_url, image_url, color, deleted_at, venue')
            .is('deleted_at', null)
            .order('premiere_date', { ascending: false }),
        supabase
            .from('scene_checklists')
            .select(`
                id,
                show_date,
                type,
                cast,
                performance:performances (
                    title
                )
            `)
            .order('show_date', { ascending: true }),
        // Najbliższy termin każdego spektaklu (lista na telefonie).
        supabase
            .from('show_lists')
            .select('performance_id, show_date, kind')
            .gte('show_date', theatreNowNaive().slice(0, 10))
            .order('show_date', { ascending: true }),
        supabase.auth.getUser(),
    ])

    const performances = performancesResult.data
    const allScheduledShows = scheduledShowsResult.data

    // Terminy z dzisiejszego dnia zostają na liście do końca dnia („Dziś 19:00”).
    const nextShowByPerformance = new Map<string, { date: string; kind: string }>()
    for (const list of upcomingListsResult.data ?? []) {
        if (!nextShowByPerformance.has(list.performance_id)) {
            nextShowByPerformance.set(list.performance_id, { date: list.show_date, kind: list.kind })
        }
    }

    const phonePerformances: PhonePerformance[] = (performances ?? [])
        .filter(p => (archive ? p.status === 'archived' : p.status !== 'archived'))
        .map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            premiere_date: p.premiere_date,
            venue: p.venue,
            nextShow: archive ? null : nextShowByPerformance.get(p.id) ?? null,
        }))

    return (
        <>
            <PerformancesPhone
                performances={phonePerformances}
                seasonLabel={seasonOf(theatreNow()).label}
                archive={archive}
                canEdit={!!userResult.data.user}
            />
            <div className="hidden md:block p-4 md:p-10 space-y-6 max-w-7xl mx-auto text-white">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                    icon={<Layers className="h-6 w-6" />}
                    iconColor="text-purple-400"
                >
                    <div className="grid grid-cols-2 w-full md:flex md:w-auto gap-2 md:gap-2 justify-end">
                        <PerformancesListActions scheduledShows={allScheduledShows || []} performances={performances || []} />
                        <Link
                            href="/performances/new"
                            className={buttonVariants({ variant: "glassy-primary", className: "w-full justify-center md:w-auto md:min-w-[140px]" })}
                        >
                            <Plus className="sm:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">{t('addProduction')}</span>
                        </Link>
                    </div>
                </PageHeader>

                <PerformancesList performances={performances || []} />
            </div>
        </>
    )
}
