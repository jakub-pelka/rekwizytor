import { createClient } from '@/utils/supabase/server'
import { format } from 'date-fns'
import { Calendar, Box, ArrowLeft, Settings, Grid } from 'lucide-react'
import { ScheduledShowsList } from '@/components/performances/ScheduledShowsList'
import { PerformanceContent } from '@/components/performances/PerformanceContent'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'
import { ExportPerformanceButton } from '@/components/performances/ExportPerformanceButton'
import { PerformanceLabelButton } from '@/components/performances/PerformanceLabelButton'
import { Button } from '@/components/ui/Button'
import { buttonVariants } from '@/components/ui/button-variants'
import { PerformanceNotesPreview } from '@/components/performances/PerformanceNotesPreview'
import { PerformanceDetailActions } from '@/components/performances/PerformanceDetailActions'
import { PerformanceGroups } from '@/components/performances/PerformanceGroups'
import { PropsChecklist } from '@/components/props/PropsChecklist'

type Props = {
    params: Promise<{ id: string }>
}

type Scene = Database['public']['Tables']['scenes']['Row']
type PropItem = Database['public']['Tables']['performance_props']['Row']
type SceneTask = Database['public']['Tables']['scene_tasks']['Row']

export default async function ProductionDetailsPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ProductionDetails')

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    // Map Supabase user to the shape expected by ExportPerformanceButton
    const user = supabaseUser ? {
        full_name: supabaseUser.user_metadata?.full_name || null,
        email: supabaseUser.email
    } : null

    // Execute all queries in parallel for ~3-5x faster loading
    const [
        productionResult,
        scheduledShowsResult,
        scenesResult,
        notesResult,
        allPropsResult,
        linkedGroupsResult
    ] = await Promise.all([
        // Performance details - full row needed for PerformanceDetailActions
        supabase
            .from('performances')
            .select('*')
            .eq('id', id)
            .single(),

        // Scheduled shows (checklists) - all fields needed for ScheduledShowsList
        supabase
            .from('scene_checklists')
            .select('*')
            .eq('performance_id', id)
            .order('show_date', { ascending: true }),

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
    const scheduledShows = scheduledShowsResult.data
    const scenes = scenesResult.data
    const notes = notesResult.data
    const allProps = allPropsResult.data
    const linkedGroups = linkedGroupsResult.data

    // Fetch tasks separately after we have scenes
    const tasksResult = scenes && scenes.length > 0
        ? await supabase
            .from('scene_tasks')
            .select('*')
            .in('scene_id', scenes.map(s => s.id))
            .order('order_index', { ascending: true })
        : { data: [] as SceneTask[] }

    const tasks = tasksResult.data

    if (!production) {
        notFound()
    }

    // Helper to get Act number
    const getActNumber = (sceneNum: string | null) => {
        if (!sceneNum) return 1
        const scene = scenes?.find((s: Scene) => s.scene_number.toString() === sceneNum)
        return scene?.act_number ?? 1
    }

    // Group props by Act (using performance_props now)
    const propsByAct: Record<number, PropItem[]> = {}

    allProps?.forEach((prop: PropItem) => {
        const actNum = getActNumber(prop.scene_number?.toString() || '1')
        if (!propsByAct[actNum]) propsByAct[actNum] = []
        propsByAct[actNum].push(prop)
    })

    const sceneNote = notes?.find(n => n.title.startsWith('Notatka sceniczna')) || null

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="relative group overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
                {/* Blurred Background Layer */}
                {production.image_url ? (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-80"
                            style={{ backgroundImage: `url(${production.image_url})` }}
                        />
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-neutral-800 to-neutral-950" />
                )}

                {/* Header Content Container */}
                <div className="relative z-10 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Poster */}
                        <div
                            className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border-2 shadow-2xl group"
                            style={{ borderColor: production.color || '#262626' }}
                        >
                            {production.image_url ? (
                                <Image
                                    src={production.image_url}
                                    alt={production.title}
                                    fill
                                    priority
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-700">
                                    <Box className="h-8 w-8" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{production.title}</h1>

                                        <div className="flex items-center flex-wrap gap-3 mt-3 text-neutral-400">
                                            <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-2 ${production.status === 'active'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                                }`}>
                                                {production.status === 'active' && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                )}
                                                {production.status}
                                            </span>

                                            {production.premiere_date && (
                                                <span className="text-sm flex items-center bg-neutral-800/50 px-2 py-0.5 rounded border border-neutral-800">
                                                    <Calendar className="mr-1.5 h-4 w-4 text-neutral-500" />
                                                    {format(new Date(production.premiere_date), 'dd MMM yyyy')}
                                                </span>
                                            )}
                                            <span className="text-sm text-neutral-500 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                {scenes?.length || 0} {t('scenes')}
                                                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                {new Set(scenes?.map((s: Scene) => s.act_number)).size || 0} {t('acts')}
                                            </span>
                                        </div>
                                    </div>

                                    {production.notes && (
                                        <p className="text-neutral-300 max-w-2xl leading-relaxed text-sm border-l-2 border-neutral-700 pl-4 py-1">
                                            {production.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-row items-center gap-3 shrink-0 pt-2 lg:pt-0 w-full sm:w-auto">
                                    {/* Actions Menu */}
                                    <PerformanceDetailActions
                                        performanceId={id}
                                        title={production.title}
                                        premiereDate={production.premiere_date}
                                        production={production}
                                        assignedProps={allProps || []}
                                        scenes={scenes || []}
                                        notes={notes || []}
                                        tasks={tasks || []}
                                        user={user}
                                    />

                                    <Link
                                        href={`/performances/${id}/live`}
                                        className={buttonVariants({ variant: "glassy-danger", className: "gap-2 flex-1 sm:flex-none justify-center" })}
                                    >
                                        {t('liveView')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 items-start">
                {/* Left Column: Scheduled Shows & Notes */}
                <div className="lg:col-span-1 space-y-8">
                    <ScheduledShowsList
                        scheduledShows={scheduledShows || []}
                        productionTitle={production.title}
                        performanceId={id}
                        sceneNote={sceneNote}
                        performanceColor={production.color}
                    />

                    <PerformanceNotesPreview
                        notes={notes || []}
                        performanceId={id}
                        title={production.title}
                        performanceColor={production.color}
                    />

                    <PerformanceGroups
                        performanceId={id}
                        performanceTitle={production.title}
                        groups={linkedGroups || []}
                        performanceColor={production.color}
                    />
                </div>

                {/* Right Column: Props List */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Scene Breakdown */}
                    <PerformanceContent
                        performanceId={id}
                        propsByAct={propsByAct}
                        scenes={scenes || []}
                        sceneNote={sceneNote}
                    />

                    {/* All Items Checklist */}
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/80 shrink-0">
                            <h3 className="font-bold text-neutral-200 font-sans text-base leading-none flex items-center gap-2">
                                <Grid className="w-4 h-4 text-neutral-400" />
                                {t('allItemsView')}
                            </h3>
                        </div>
                        <div className="p-6">
                            <PropsChecklist
                                performanceId={id}
                                initialProps={allProps || []}
                                variant="checklist"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
