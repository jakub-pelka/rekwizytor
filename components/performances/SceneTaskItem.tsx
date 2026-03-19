'use client'

import { useState, useRef } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { Database } from '@/types/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SceneTask = Database['public']['Tables']['scene_tasks']['Row']

// Kanban adds columnId to items
type ExtendedSceneTask = SceneTask & { columnId: string }

interface SceneTaskItemProps {
    readonly task: ExtendedSceneTask
    readonly isOverlay?: boolean
    readonly onUpdate: (taskId: string, sceneId: string, newContent: string) => void
    readonly onSave: (taskId: string, newContent: string) => void
    readonly onDelete: (sceneId: string, taskId: string) => void
}

export function SceneTaskItem({ task, isOverlay, onUpdate, onSave, onDelete }: SceneTaskItemProps) {
    const [originalContent, setOriginalContent] = useState<string | null>(null)
    const isReverting = useRef(false)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${isOverlay
                ? 'bg-neutral-800 border-primary-500 shadow-xl scale-105'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                }`}
        >
            <div {...attributes} {...listeners} className="mt-1 shrink-0 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-neutral-600" />
            </div>
            <div className="flex-1 min-w-0">
                <input
                    type="text"
                    value={task.content}
                    onChange={(e) => onUpdate(task.id, task.scene_id, e.target.value)}
                    onFocus={() => setOriginalContent(task.content)}
                    onBlur={(e) => {
                        if (isReverting.current) {
                            isReverting.current = false
                            setOriginalContent(null)
                            return
                        }

                        const val = e.target.value.trim()
                        if (!val) {
                            onDelete(task.scene_id, task.id)
                        } else if (originalContent !== val) {
                            onSave(task.id, val)
                        }
                        setOriginalContent(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            if (originalContent !== null) {
                                isReverting.current = true
                                onUpdate(task.id, task.scene_id, originalContent)
                                    ; (e.target as HTMLInputElement).blur()
                            }
                        }
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur()
                        }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-sm text-neutral-300 border-none outline-none focus:text-white p-0 resize-none"
                />
            </div>
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(task.scene_id, task.id)}
                className={`p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all ${isOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )
}
