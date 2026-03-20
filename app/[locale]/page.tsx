import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { isToday } from 'date-fns'

import { Greeting } from '@/components/dashboard/Greeting'
import { PendingUsersAlert } from '@/components/dashboard/PendingUsersAlert'
import { ReadOnlyBanner } from '@/components/dashboard/ReadOnlyBanner'
import { NearestPerformanceCard } from '@/components/dashboard/NearestPerformanceCard'
import { UserMentionsList } from '@/components/dashboard/UserMentionsList'
import { QuickNav } from '@/components/dashboard/QuickNav'
import { InventoryStats } from '@/components/dashboard/InventoryStats'
import { UpcomingPerformances } from '@/components/dashboard/UpcomingPerformances'
import { Database } from '@/types/supabase'

type PerformanceRow = Database['public']['Tables']['performances']['Row']
type ChecklistRow = Database['public']['Tables']['scene_checklists']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type PartialChecklist = {
  id: string
  show_date: string
  performance: {
    id: string
    title: string
    premiere_date: string | null
    image_url: string | null
    status: 'active' | 'upcoming' | 'archived'
  } | null
}

type PartialChecklistWithColor = {
  id: string
  show_date: string
  performance: {
    id: string
    title: string
    status: 'active' | 'upcoming' | 'archived'
    color: string | null
  } | null
}

type PartialPerformance = {
  id: string
  title: string
  premiere_date: string | null
  status: 'active' | 'upcoming' | 'archived'
  color: string | null
}

interface DashboardPerformance {
  id: string
  title: string
  premiere_date: string | null
  next_show_date?: string | null
  image_url: string | null
  status: string
  progress?: {
    completed: number
    total: number
  }
}

interface UpcomingPerformance {
  id: string
  title: string
  date: string
  status: string
  color?: string
}

function getDisplayName(user: any, profile: Pick<ProfileRow, 'full_name'> | null): string {
  if (!user) return 'User'

  return profile?.full_name
    || user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || 'User'
}

function extractSettledData<T>(result: PromiseSettledResult<{ data: T | null }>): T | null {
  return result.status === 'fulfilled' ? result.value.data : null
}

function extractSettledCount(result: PromiseSettledResult<{ count: number | null }>): number {
  return result.status === 'fulfilled' ? result.value.count || 0 : 0
}

async function fetchTodayProgress(supabase: any, nearestChecklist: PartialChecklist | null) {
  if (!nearestChecklist || !isToday(new Date(nearestChecklist.show_date))) {
    return undefined
  }

  const { data: items } = await supabase
    .from('scene_checklist_items')
    .select('is_prepared')
    .eq('scene_checklist_id', nearestChecklist.id)

  if (!items?.length) return undefined

  return {
    completed: items.filter((i: { is_prepared: boolean }) => i.is_prepared).length,
    total: items.length
  }
}

function buildNearestPerformance(
  nearestChecklist: PartialChecklist | null,
  todayProgress: { completed: number; total: number } | undefined
): DashboardPerformance | null {
  if (!nearestChecklist?.performance) {
    return null
  }

  return {
    id: nearestChecklist.performance.id,
    title: nearestChecklist.performance.title,
    premiere_date: nearestChecklist.performance.premiere_date,
    image_url: nearestChecklist.performance.image_url,
    status: nearestChecklist.performance.status,
    next_show_date: nearestChecklist.show_date,
    progress: todayProgress
  }
}

function buildUpcomingPerformances(
  scheduledShows: PartialChecklistWithColor[],
  futurePremieres: PartialPerformance[]
): UpcomingPerformance[] {
  const combinedPerformances: UpcomingPerformance[] = [
    ...scheduledShows
      .filter(item => item.performance)
      .map(item => {
        const perf = item.performance!
        return {
          id: perf.id,
          title: perf.title,
          date: item.show_date,
          status: perf.status,
          color: perf.color ?? undefined
        }
      }),
    ...futurePremieres.map(perf => ({
      id: perf.id,
      title: perf.title,
      date: perf.premiere_date!,
      status: perf.status,
      color: perf.color ?? undefined
    }))
  ]

  const uniquePerformancesMap = new Map()
  const today = new Date(new Date().setHours(0, 0, 0, 0))

  combinedPerformances.forEach(p => {
    if (new Date(p.date) >= today) {
      const key = `${p.id}-${p.date.split('T')[0]}`
      if (!uniquePerformancesMap.has(key)) {
        uniquePerformancesMap.set(key, p)
      }
    }
  })

  return Array.from(uniquePerformancesMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isReadOnly = !user

  let displayName = 'User'
  if (user) {
    const result = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const profile = result.data as Pick<ProfileRow, 'full_name'> | null
    displayName = getDisplayName(user, profile)
  }

  const t = await getTranslations('Dashboard')

  const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Execute all independent queries in parallel
  const [
    nearestPerformanceResult,
    upcomingChecklistsResult,
    upcomingPremieresResult,
    groupsCountResult,
    performancesCountResult,
    notesCountResult,
    upcomingThisWeekResult,
    mentionsResult,
    newGroupsCountResult,
    newPerformancesCountResult,
    newNotesCountResult,
  ] = await Promise.allSettled([
    // Fetch Nearest Upcoming Performance
    supabase
      .from('scene_checklists')
      .select(`
        id,
        show_date,
        performance:performances (
          id,
          title,
          premiere_date,
          image_url,
          status
        )
      `)
      .gte('show_date', new Date().toISOString())
      .order('show_date', { ascending: true })
      .limit(1)
      .single(),

    // Fetch Upcoming Scheduled Shows
    supabase
      .from('scene_checklists')
      .select(`
        id,
        show_date,
        performance:performances (
          id,
          title,
          status,
          color
        )
      `)
      .gte('show_date', new Date().toISOString())
      .order('show_date', { ascending: true })
      .limit(5),

    // Fetch Upcoming Premieres
    supabase
      .from('performances')
      .select('id, title, premiere_date, status, color')
      .is('deleted_at', null)
      .in('status', ['active', 'upcoming'])
      .gte('premiere_date', new Date().toISOString())
      .order('premiere_date', { ascending: true })
      .limit(5),

    // Total groups
    supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Total performances
    supabase
      .from('performances')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Total notes
    supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Upcoming this week (7 days)
    supabase
      .from('scene_checklists')
      .select('id', { count: 'exact', head: true })
      .gte('show_date', new Date().toISOString())
      .lt('show_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Fetch User Mentions in Notes (only if user exists)
    user
      ? supabase
        .from('note_mentions')
        .select(`
            id,
            note_id,
            created_at,
            note:notes (
              id,
              title,
              performance_id,
              performance:performances (
                title,
                color
              )
            )
          `)
        .eq('mentioned_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      : Promise.resolve({ data: null, error: null }),

    // New groups (last 7 days)
    supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', lastWeekDate),

    // New performances (last 7 days)
    supabase
      .from('performances')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', lastWeekDate),

    // New notes (last 7 days)
    supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', lastWeekDate),
  ])

  const nearestChecklist = extractSettledData<PartialChecklist>(nearestPerformanceResult)

  const todayProgress = await fetchTodayProgress(supabase, nearestChecklist)
  const nearestPerformance = buildNearestPerformance(nearestChecklist, todayProgress)

  const scheduledShows = extractSettledData<PartialChecklistWithColor[]>(upcomingChecklistsResult) || []
  const futurePremieres = extractSettledData<PartialPerformance[]>(upcomingPremieresResult) || []
  const upcomingPerformances = buildUpcomingPerformances(scheduledShows, futurePremieres)

  const groupsCount = extractSettledCount(groupsCountResult)
  const performancesCount = extractSettledCount(performancesCountResult)
  const notesCount = extractSettledCount(notesCountResult)
  const upcomingThisWeekCount = extractSettledCount(upcomingThisWeekResult)

  const recentMentions = extractSettledData<any[]>(mentionsResult) || []

  const newGroupsCount = extractSettledCount(newGroupsCountResult)
  const newPerformancesCount = extractSettledCount(newPerformancesCountResult)
  const newNotesCount = extractSettledCount(newNotesCountResult)

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {isReadOnly && <ReadOnlyBanner />}
      <PendingUsersAlert />

      <Greeting name={displayName} />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          <section>
            <NearestPerformanceCard performance={nearestPerformance} />
          </section>

          <div className="grid gap-8">
            <section>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-900 rounded-full" />
                {t('quickActions')}
              </h2>
              <QuickNav />
            </section>

            <section>
              <UpcomingPerformances performances={upcomingPerformances} />
            </section>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          <section>
            <InventoryStats
              groupsCount={groupsCount}
              performancesCount={performancesCount}
              notesCount={notesCount}
              upcomingThisWeekCount={upcomingThisWeekCount}
              newGroupsCount={newGroupsCount}
              newPerformancesCount={newPerformancesCount}
              newNotesCount={newNotesCount}
            />
          </section>

          <section>
            <UserMentionsList mentions={recentMentions} />
          </section>
        </div>
      </div>
    </div>
  )
}
