import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { PerformanceSceneView } from '@/components/performances/PerformanceSceneView'
import { Layers, Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'

type Props = {
    readonly params: Promise<{ readonly id: string }>
}

export default async function PerformanceTasksPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ProductionDetails')

    // Fetch performance and scenes
    const [performanceResult, scenesResult, propsResult] = await Promise.all([
        supabase
            .from('performances')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('scenes')
            .select('*')
            .eq('performance_id', id)
            .order('act_number', { ascending: true })
            .order('scene_number', { ascending: true }),
        supabase
            .from('performance_props')
            .select('*')
            .eq('performance_id', id)
    ])

    const performance = performanceResult.data
    const scenes = scenesResult.data || []
    const allProps = propsResult.data || []

    if (!performance) {
        return <div>Performance not found</div>
    }

    // Group props by act for PerformanceSceneView
    // Since performance_props doesn't have act_number, we need to map via scenes
    const scenesMap = new Map(
        scenes
            .filter(s => s.scene_number != null)
            .map(s => [s.scene_number!.toString(), s.act_number])
    )

    const propsByAct: Record<number, any[]> = {}

    allProps.forEach(prop => {
        const sceneNum = prop.scene_number?.toString()
        if (!sceneNum) return

        const actNum = scenesMap.get(sceneNum)

        if (actNum) {
            if (!propsByAct[actNum]) {
                propsByAct[actNum] = []
            }
            propsByAct[actNum].push(prop)
        }
    })

    const titleTranslation = t('sceneBreakdown')

    return (
        <div className="flex flex-col h-full bg-neutral-950 p-6 md:p-10">
            <PageHeader
                title={`${titleTranslation}: ${performance.title}`}
                subtitle="Pełna rozpiska scen i zadań"
                icon={<Layers className="w-6 h-6 text-white" />}
                iconColor={performance.color || 'text-purple-400'}
            >
                <div className="flex items-center gap-2">
                    <Link
                        href={`/performances/${id}`}
                        className={buttonVariants({ variant: 'glassy-secondary', size: 'sm' })}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('backToProduction')}
                    </Link>

                    {/* Edit Actions Dropdown */}
                    <div className="relative group">
                        <button className={buttonVariants({ variant: 'glassy-primary', size: 'sm' })}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('editButton')}
                        </button>

                        {/* Dropdown on hover/focus */}
                        <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                            <Link
                                href={`/performances/${id}/scenes`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                            >
                                <Layers className="w-4 h-4" />
                                {t('editScenes')}
                            </Link>
                            <Link
                                href={`/performances/${id}/tasks/edit`}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors border-t border-neutral-800"
                            >
                                <Edit className="w-4 h-4" />
                                {t('editTasks')}
                            </Link>
                        </div>
                    </div>
                </div>
            </PageHeader>

            <div className="flex-1">
                <PerformanceSceneView
                    performanceId={id}
                    propsByAct={propsByAct}
                    scenes={scenes}
                    sceneNote={null}
                    limitTasks={false}
                    enableScrolling={false}
                />
            </div>
        </div>
    )
}
