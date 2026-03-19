'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import { notify } from '@/utils/notify'
import { SceneTaskItem } from './SceneTaskItem'

type Scene = Database['public']['Tables']['scenes']['Row']
type SceneTask = Database['public']['Tables']['scene_tasks']['Row']

type Props = {
    readonly performanceId: string
    readonly scenes: Scene[]
}

export function SceneTaskEditor({ performanceId, scenes }: Props) {
    const [tasks, setTasks] = useState<Record<string, SceneTask[]>>({})
    const [loading, setLoading] = useState(true)
    const [newTaskContent, setNewTaskContent] = useState<Record<string, string>>({})
    const supabase = createClient()
    const t = useTranslations('ProductionDetails')

    // Load tasks for all scenes
    useEffect(() => {
        loadTasks()
    }, [scenes])

    const loadTasks = async () => {
        setLoading(true)
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

            setTasks(grouped)
        } catch (error) {
            console.error('Error loading tasks:', error)
            notify.error('Błąd ładowania zadań')
        } finally {
            setLoading(false)
        }
    }

    const handleAddTask = async (sceneId: string) => {
        const content = newTaskContent[sceneId]?.trim()
        if (!content) return

        try {
            const sceneTasks = tasks[sceneId] || []
            const maxOrder = Math.max(0, ...sceneTasks.map(t => t.order_index))

            const { data, error } = await supabase
                .from('scene_tasks')
                .insert({
                    scene_id: sceneId,
                    content,
                    order_index: maxOrder + 1
                })
                .select()
                .single()

            if (error) throw error

            setTasks(prev => ({
                ...prev,
                [sceneId]: [...(prev[sceneId] || []), data]
            }))

            setNewTaskContent(prev => ({ ...prev, [sceneId]: '' }))
            notify.success('Zadanie dodane')
        } catch (error) {
            console.error('Error adding task:', error)
            notify.error('Błąd dodawania zadania')
        }
    }

    const handleDeleteTask = async (sceneId: string, taskId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return

        try {
            const { error } = await supabase
                .from('scene_tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error

            setTasks(prev => ({
                ...prev,
                [sceneId]: (prev[sceneId] || []).filter(t => t.id !== taskId)
            }))

            notify.success('Zadanie usunięte')
        } catch (error) {
            console.error('Error deleting task:', error)
            notify.error('Błąd usuwania zadania')
        }
    }

    const updateLocalTask = (taskId: string, sceneId: string, newContent: string) => {
        setTasks(prev => ({
            ...prev,
            [sceneId]: (prev[sceneId] || []).map(t =>
                t.id === taskId ? { ...t, content: newContent } : t
            )
        }))
    }

    const saveTask = async (taskId: string, newContent: string) => {
        try {
            const { error } = await supabase
                .from('scene_tasks')
                .update({ content: newContent })
                .eq('id', taskId)

            if (error) throw error
        } catch (error) {
            console.error('Error saving task:', error)
            notify.error('Błąd zapisu zadania')
        }
    }

    const handleReorder = async (newItems: (SceneTask & { columnId: string })[]) => {
        // Optimistic update
        const grouped: Record<string, SceneTask[]> = {}
        newItems.forEach(item => {
            const sceneId = item.columnId
            if (!grouped[sceneId]) grouped[sceneId] = []
            // Remove columnId from the object stored in state if we want to match exact types, 
            // but for now keeping it is fine or we can destructure.
            // Actually, we should update the order_index based on the new array order
            grouped[sceneId].push({ ...item, scene_id: sceneId })
        })

        // Recalculate order_index for all items in affected scenes
        Object.keys(grouped).forEach(sceneId => {
            grouped[sceneId].forEach((task, index) => {
                task.order_index = index
            })
        })

        setTasks(grouped)

        // Find changed items and persist
        try {
            const updates = []
            for (const item of newItems) {
                updates.push({
                    id: item.id,
                    scene_id: item.columnId,
                    order_index: newItems.filter(i => i.columnId === item.columnId).indexOf(item),
                    content: item.content
                })
            }

            const { error } = await supabase
                .from('scene_tasks')
                .upsert(updates)

            if (error) throw error
        } catch (error) {
            console.error('Error updating task order:', error)
            notify.error('Błąd zapisu kolejności')
            loadTasks() // Revert on error
        }
    }

    // Group scenes by act
    const scenesByAct: Record<number, Scene[]> = {}
    scenes.forEach(scene => {
        const act = scene.act_number ?? 1
        if (!scenesByAct[act]) scenesByAct[act] = []
        scenesByAct[act].push(scene)
    })

    const sortedActs = Object.keys(scenesByAct).map(Number).sort((a, b) => a - b)

    if (loading) {
        return <div className="p-6 text-center text-neutral-400">Ładowanie...</div>
    }

    return (
        <div className="space-y-12">
            {sortedActs.map(actNum => {
                const actScenes = scenesByAct[actNum].sort((a, b) => a.scene_number - b.scene_number)

                // Prepare Kanban data for this Act
                const columns = actScenes.map(scene => ({
                    id: scene.id,
                    title: `${scene.scene_number} ${scene.name || ''}`
                }))

                const items = actScenes.flatMap(scene =>
                    (tasks[scene.id] || []).map(task => ({
                        ...task,
                        columnId: scene.id // KanbanItem requirement
                    }))
                )

                return (
                    <div key={actNum} className="space-y-4">
                        {/* Act Header */}
                        <div className="flex items-center gap-2 px-2 mb-6">
                            <div className="h-px flex-1 bg-neutral-800" />
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                {t('act', { actNum })}
                            </span>
                            <div className="h-px flex-1 bg-neutral-800" />
                        </div>

                        <div className="overflow-x-auto pb-4">
                            <KanbanBoard
                                columns={columns}
                                items={items}
                                onItemReorder={handleReorder}
                                renderColumnHeader={(col) => (
                                    <div className="flex items-baseline gap-2 mb-3 pb-3 border-b border-neutral-800">
                                        <span className="text-lg font-bold text-white">
                                            {actScenes.find(s => s.id === col.id)?.scene_number}
                                        </span>
                                        <span className="text-sm text-neutral-400 truncate">
                                            {actScenes.find(s => s.id === col.id)?.name}
                                        </span>
                                    </div>
                                )}
                                renderItem={(task, isOverlay) => (
                                    <SceneTaskItem
                                        key={task.id}
                                        task={task}
                                        isOverlay={isOverlay}
                                        onUpdate={updateLocalTask}
                                        onSave={saveTask}
                                        onDelete={handleDeleteTask}
                                    />
                                )}
                                renderColumnFooter={(col) => (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newTaskContent[col.id as string] || ''}
                                                onChange={(e) => setNewTaskContent(prev => ({
                                                    ...prev,
                                                    [col.id]: e.target.value
                                                }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddTask(col.id as string)
                                                    }
                                                }}
                                                placeholder="Dodaj..."
                                                className="flex-1 px-3 py-1.5 bg-neutral-900/50 border border-neutral-800 rounded-md text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-colors"
                                            />
                                            <Button
                                                onClick={() => handleAddTask(col.id as string)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                )
            })}

            {scenes.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                    <p>Brak zdefiniowanych scen.</p>
                    <p className="text-sm mt-2">Najpierw dodaj sceny w zarządzaniu scenami.</p>
                </div>
            )}
        </div>
    )
}
