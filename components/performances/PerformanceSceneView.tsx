'use client'

import { Fragment, useState, useEffect } from 'react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { deletePerformanceItem } from '@/app/actions/performance-props'
import { Trash2 } from 'lucide-react'
import { SceneDetailModal } from './SceneDetailModal'
import { createClient } from '@/utils/supabase/client'

type PropItem = Database['public']['Tables']['performance_props']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type SceneTask = Database['public']['Tables']['scene_tasks']['Row']

type Props = {
    readonly performanceId: string
    readonly propsByAct: Record<number, PropItem[]>
    readonly scenes: Scene[]
    readonly sceneNote: any | null // Keep for backward compatibility during migration
    readonly limitTasks?: boolean
    readonly enableScrolling?: boolean
}

export function PerformanceSceneView({
    performanceId,
    propsByAct,
    scenes,
    sceneNote,
    limitTasks = true,
    enableScrolling = true
}: Props) {
    const t = useTranslations('ProductionDetails')
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
    const [sceneTasks, setSceneTasks] = useState<Record<string, SceneTask[]>>({})
    const [, setLoadingTasks] = useState(true)
    const supabase = createClient()

    // Load tasks from database
    useEffect(() => {
        if (scenes.length === 0) {
            setLoadingTasks(false)
            return
        }

        const loadTasks = async () => {
            try {
                const { data, error } = await supabase
                    .from('scene_tasks')
                    .select('*')
                    .in('scene_id', scenes.map(s => s.id))
                    .order('order_index', { ascending: true })

                if (error) throw error

                // Group by scene_id
                const grouped: Record<string, SceneTask[]> = {}
                data?.forEach(task => {
                    if (!grouped[task.scene_id]) grouped[task.scene_id] = []
                    grouped[task.scene_id].push(task)
                })

                setSceneTasks(grouped)
            } catch (error) {
                console.error('Error loading scene tasks:', error)
            } finally {
                setLoadingTasks(false)
            }
        }

        loadTasks()
    }, [scenes, supabase])

    // Helper to get scenes for an act
    const getScenesForAct = (actNum: number) => {
        return scenes?.filter(s => s.act_number === actNum) || []
    }

    // Get sorted act numbers
    const sortedActs = Object.keys(propsByAct)
        .map(Number)
        .sort((a, b) => a - b)

    // Ensure we have at least Acts that have scenes, even if no props
    const actsFromScenes = new Set(scenes?.map(s => s.act_number ?? 1) || [])
    const allActs = Array.from(new Set([...sortedActs, ...Array.from(actsFromScenes)])).sort((a, b) => a - b)

    // Group scenes by Act for easier rendering
    const scenesByAct: Record<number, Scene[]> = {}
    allActs.forEach(actNum => {
        scenesByAct[actNum] = getScenesForAct(actNum)
    })

    return (
        <div className="space-y-12">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-b-lg bg-neutral-900/50">
                <div className={`${enableScrolling ? 'max-h-[500px] overflow-y-auto custom-scrollbar' : ''}`}>
                    <table className="w-full relative">
                        <thead className={`bg-neutral-900 border-b border-neutral-800 ${enableScrolling ? 'sticky top-0 z-10' : ''} shadow-sm`}>
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider w-1/3 bg-neutral-900">
                                    {t('scene')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider bg-neutral-900">
                                    {t('props')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {allActs.map(actNum => (
                                <Fragment key={actNum}>
                                    {/* Act Header */}
                                    <tr className="bg-neutral-900/80">
                                        <td colSpan={2} className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider border-y border-neutral-800 text-center">
                                            {actNum === 0 ? t('preparation') : t('act', { actNum })}
                                        </td>
                                    </tr>
                                    {scenesByAct[actNum]
                                        ?.sort((a, b) => a.scene_number - b.scene_number)
                                        .map(scene => {
                                            // Get tasks for this scene from database
                                            const allTasks = sceneTasks[scene.id] || []
                                            const visibleTasks = limitTasks ? allTasks.slice(0, 3) : allTasks
                                            const hasMoreTasks = limitTasks && allTasks.length > 3

                                            return (
                                                <tr
                                                    key={scene.id}
                                                    onClick={() => setSelectedScene(scene)}
                                                    className="hover:bg-neutral-800/50 cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                        <div className="font-medium">
                                                            {(scene.scene_number === 0 || scene.type === 'intermission') ? 'P' : scene.scene_number}
                                                        </div>
                                                        {scene.name && (
                                                            <div className={scene.scene_number === 0 ? "text-xs text-burgundy-light font-bold" : "text-xs text-neutral-500"}>
                                                                {scene.scene_number === 0 ? t('preparation') : scene.name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-white align-top">
                                                        {allTasks.length > 0 && (
                                                            <ul className="list-disc ml-4 space-y-1.5 text-neutral-300 text-sm">
                                                                {visibleTasks.map((task) => (
                                                                    <li key={task.id} className="text-sm leading-relaxed">{task.content}</li>
                                                                ))}
                                                                {hasMoreTasks && (
                                                                    <li className="text-xs text-neutral-500 italic list-none pt-1">
                                                                        +{allTasks.length - 3} {t('moreTasks')}
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                </Fragment>
                            ))}

                            {allActs.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-neutral-500">
                                        {t('noScenes')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-6">
                {allActs.map(actNum => (
                    <div key={actNum} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="h-px flex-1 bg-neutral-800" />
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                {actNum === 0 ? t('preparation') : t('act', { actNum })}
                            </span>
                            <div className="h-px flex-1 bg-neutral-800" />
                        </div>

                        <div className="space-y-3">
                            {scenesByAct[actNum]
                                ?.sort((a, b) => a.scene_number - b.scene_number)
                                .map(scene => {
                                    const sceneProps = propsByAct[actNum]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()) || []
                                    const tasks = sceneTasks[scene.id] || []

                                    return (
                                        <div
                                            key={scene.id}
                                            onClick={() => setSelectedScene(scene)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    setSelectedScene(scene)
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            className="bg-neutral-900 border border-neutral-800 p-4 space-y-3 cursor-pointer hover:bg-neutral-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg md:rounded-lg"
                                        >
                                            <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-800 mb-2">
                                                <span className="text-lg font-bold text-white">
                                                    {(scene.scene_number === 0 || scene.type === 'intermission') ? 'P' : scene.scene_number}
                                                </span>
                                                {scene.name && <span className="text-sm text-neutral-400">{scene.name}</span>}
                                            </div>

                                            {tasks.length > 0 && (
                                                <ul className="list-disc list-inside space-y-1.5 text-neutral-300 text-sm">
                                                    {tasks.map((task) => (
                                                        <li key={task.id}>{task.content}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Scene Detail Modal */}
            {selectedScene && (
                <SceneDetailModal
                    isOpen={!!selectedScene}
                    onClose={() => setSelectedScene(null)}
                    scene={selectedScene}
                    sceneNote={sceneNote}
                    allScenes={scenes}
                />
            )}
        </div>
    )
}

