'use client'

import { useMemo, useState } from 'react'
import { Trash2, GripVertical, Plus, Loader2, MoreVertical, Edit2, Lock } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { KanbanBoard, KanbanColumn, KanbanItem } from '@/components/ui/KanbanBoard'
import { DropdownAction } from '@/components/ui/DropdownAction'

// Define local Scene type
export type SceneItem = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
    type?: string | null
}

// Extend SceneItem to satisfy KanbanItem
type KanbanSceneItem = SceneItem & { columnId: string | number }

type Props = {
    scenes: SceneItem[]
    onReorder: (newScenes: SceneItem[]) => void
    onUpdate: (id: string, updates: Partial<SceneItem>) => void
    onRemove: (id: string) => void
    onRemoveAct: (act: number) => void
    onAdd: (act: number, name: string) => Promise<void>
}

export function SceneKanbanBoard({ scenes, onReorder, onUpdate, onRemove, onRemoveAct, onAdd }: Props) {
    const [addingToAct, setAddingToAct] = useState<number | null>(null)
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({})
    const [showInputForAct, setShowInputForAct] = useState<Record<number, boolean>>({})

    const acts = useMemo(() => {
        const validScenes = scenes.filter(s => typeof s.act_number === 'number')
        const uniqueActs = Array.from(new Set(validScenes.map(s => s.act_number))).sort((a, b) => a - b)
        if (uniqueActs.length === 0) return [1]
        return uniqueActs
    }, [scenes])

    const nextActNumber = acts.length > 0 ? Math.max(...acts) + 1 : 1

    // Map scenes to Kanban items
    const kanbanItems: KanbanSceneItem[] = useMemo(() => scenes.map(s => ({
        ...s,
        columnId: s.act_number
    })), [scenes])

    // Map acts to Kanban columns
    const columns: KanbanColumn[] = acts.map(act => ({
        id: act,
        title: `Akt ${act}`
    }))

    const handleItemReorder = (newItems: KanbanSceneItem[]) => {
        // Convert back to SceneItem and update act_number based on columnId
        const newScenes = newItems.map(item => ({
            id: item.id,
            scene_number: item.scene_number, // This might need re-calc which happens in onReorder usually?
            name: item.name,
            act_number: Number(item.columnId)
        }))

        // Verify sequence and re-number if needed
        const processedScenes = resequenceScenes(newScenes)
        onReorder(processedScenes)
    }

    const resequenceScenes = (items: SceneItem[]): SceneItem[] => {
        const uniqueActs = Array.from(new Set(items.map(s => s.act_number))).sort((a, b) => a - b)
        let result: SceneItem[] = []

        uniqueActs.forEach(act => {
            // Get scenes for this act
            const actScenes = items.filter(s => s.act_number === act)

            // Separate by type
            const prepScenes = actScenes.filter(s => s.type === 'preparation')
            const intermissionScenes = actScenes.filter(s => s.type === 'intermission')
            const normalScenes = actScenes.filter(s => s.type !== 'preparation' && s.type !== 'intermission')

            // Force order: Prep -> Normal -> Intermission
            // Note: In a robust drag-drop, valid "normal" scenes maintain their relative order from 'items'
            const sortedActScenes = [...prepScenes, ...normalScenes, ...intermissionScenes]

            // Re-assign scene numbers
            sortedActScenes.forEach((scene, index) => {
                const newNum = act === 0 ? index : index + 1

                // Construct updated scene object
                result.push({
                    ...scene,
                    scene_number: newNum,
                    act_number: act // Ensure act is correct
                })
            })
        })

        return result
    }

    const handleQuickAdd = async (act: number) => {
        const name = quickAddValues[act]?.trim() || `Scena ${scenes.filter(s => s.act_number === act).length + 1}`

        setAddingToAct(act)
        try {
            await onAdd(act, name)
            setQuickAddValues(prev => ({ ...prev, [act]: '' }))
            setShowInputForAct(prev => ({ ...prev, [act]: false }))
        } finally {
            setAddingToAct(null)
        }
    }

    const handleAddAct = async () => {
        await onAdd(nextActNumber, 'Scene 1')
    }

    // --- Renderers ---

    const renderColumnHeader = (column: KanbanColumn, items: KanbanSceneItem[]) => {
        const actNumber = Number(column.id)
        return (
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 rounded-t-xl flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">{actNumber === 0 ? 'Przygotowanie' : `Akt ${actNumber}`}</span>
                    <span className="text-xs text-neutral-500 font-mono bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700">
                        {items.length}
                    </span>
                </div>
                <button
                    onClick={() => onRemoveAct(actNumber)}
                    className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover/act:opacity-100"
                    title="Usuń Akt"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        )
    }

    const renderColumnFooter = (column: KanbanColumn, items: KanbanSceneItem[]) => {
        const act = Number(column.id)
        return (
            <div className="p-3 border-t border-neutral-800/50">
                {showInputForAct[act] ? (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nazwa sceny..."
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder-neutral-600 shadow-inner"
                                value={quickAddValues[act] || ''}
                                onChange={(e) => setQuickAddValues({ ...quickAddValues, [act]: e.target.value })}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleQuickAdd(act)
                                    if (e.key === 'Escape') setShowInputForAct(prev => ({ ...prev, [act]: false }))
                                }}
                                disabled={addingToAct === act}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowInputForAct(prev => ({ ...prev, [act]: false }))}
                                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={() => handleQuickAdd(act)}
                                disabled={addingToAct === act}
                                className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {addingToAct === act ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Dodaj
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowInputForAct(prev => ({ ...prev, [act]: true }))}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all text-sm font-medium border border-transparent hover:border-neutral-700 group"
                    >
                        <div className="w-5 h-5 rounded-full border border-neutral-600 flex items-center justify-center group-hover:border-white group-hover:bg-white/10 transition-colors">
                            <Plus className="w-3 h-3" />
                        </div>
                        Dodaj Scenę
                    </button>
                )}
            </div>
        )
    }

    const renderItem = (item: KanbanSceneItem, isOverlay?: boolean) => {
        return (
            <SortableScene
                key={item.id}
                scene={item}
                onUpdate={onUpdate}
                onRemove={onRemove}
                isOverlay={isOverlay}
            />
        )
    }

    const renderExtraActions = (
        <button
            onClick={handleAddAct}
            className="shrink-0 w-full lg:w-[320px] h-auto border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-900 transition-all gap-2 group min-h-[150px] py-8"
        >
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Nowy Akt</span>
        </button>
    )

    const handleValidateMove = (item: KanbanSceneItem, targetColumnId: string | number): boolean => {
        const sourceAct = Number(item.columnId)
        const targetAct = Number(targetColumnId)

        // Prevent moving scenes FROM Preparation (Act 0) to other acts
        if (sourceAct === 0 && targetAct !== 0) {
            // Optional: You could show a toast here if you wanted specific feedback
            return false
        }

        // Prevent moving Intermission scenes out of their act (optional, but good for consistency)
        if (item.type === 'intermission' && sourceAct !== targetAct) {
             return false
        }

        return true
    }

    return (
        <div className="wrapper-class-if-needed">
            <KanbanBoard
                items={kanbanItems}
                columns={columns}
                renderItem={renderItem}
                renderColumnHeader={renderColumnHeader}
                renderColumnFooter={renderColumnFooter}
                onItemReorder={handleItemReorder}
                extraActions={renderExtraActions}
                onValidateMove={handleValidateMove}
            />
        </div>
    )
}

function SortableScene({ scene, onUpdate, onRemove, isOverlay }: { scene: SceneItem, onUpdate: (id: string, updates: Partial<SceneItem>) => void, onRemove: (id: string) => void, isOverlay?: boolean }) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(scene.name || '')
    const isSystemScene = scene.type === 'preparation' || scene.type === 'intermission'

    const getSceneDisplayNumber = (): string | number => {
        if (scene.scene_number === 0 || scene.type === 'intermission') return 'P'
        return scene.scene_number
    }

    const getContainerClasses = (): string => {
        const base = 'group flex items-center gap-3 p-3 rounded-lg border transition-all shadow-sm'
        const variant = isSystemScene
            ? 'bg-neutral-900/40 border-neutral-800 border-dashed hover:border-neutral-700'
            : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
        return `${base} ${variant}`
    }

    const getDragHandleClasses = (): string => {
        return isSystemScene
            ? 'p-1 cursor-grab text-neutral-600 hover:text-neutral-500'
            : 'p-1 cursor-grab text-neutral-600 hover:text-neutral-400'
    }

    const getBadgeClasses = (): string => {
        const base = 'w-8 h-8 shrink-0 rounded flex items-center justify-center font-mono font-bold text-sm'
        const variant = isSystemScene
            ? 'bg-neutral-800/50 border border-neutral-700/50 text-neutral-500'
            : 'bg-neutral-900 border border-neutral-800 text-white'
        return `${base} ${variant}`
    }

    const getNameClasses = (): string => {
        const base = 'block w-full text-sm font-medium truncate transition-colors'
        const variant = isSystemScene
            ? 'text-neutral-500 italic cursor-default'
            : 'text-white cursor-text hover:text-amber-400'
        return `${base} ${variant}`
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur()
        } else if (e.key === 'Escape') {
            setTempName(scene.name || '')
            setIsEditing(false)
        }
    }

    const handleNameClick = () => {
        if (!isSystemScene) {
            setTempName(scene.name || '')
            setIsEditing(true)
        }
    }

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id, disabled: isEditing })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const handleBlur = () => {
        setIsEditing(false)
        if (tempName !== scene.name) {
            onUpdate(scene.id, { name: tempName })
        }
    }

    if (isOverlay) {
        return (
            <div className="p-4 rounded-lg shadow-2xl opacity-90 text-white font-medium w-[300px] flex items-center gap-3 bg-neutral-800 border-neutral-600 border">
                <div className="w-8 h-8 shrink-0 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-white font-mono font-bold text-sm">
                    {getSceneDisplayNumber()}
                </div>
                <span>{scene.name}</span>
            </div>
        )
    }

    return (
        <div ref={setNodeRef} style={style} className={getContainerClasses()}>
            <div {...attributes} {...listeners} className={getDragHandleClasses()}>
                <GripVertical className={`w-4 h-4 ${scene.type === 'intermission' ? 'opacity-50' : ''}`} />
            </div>

            <div className={getBadgeClasses()}>
                {getSceneDisplayNumber()}
            </div>

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        autoFocus
                        disabled={isSystemScene}
                    />
                ) : (
                    <span
                        onClick={handleNameClick}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleNameClick()
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        className={getNameClasses()}
                    >
                        {scene.name || 'Bez nazwy'}
                    </span>
                )}
            </div>

            {!isSystemScene ? (
                <div onClick={e => e.stopPropagation()} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <DropdownAction
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-neutral-500 hover:text-white data-[state=open]:opacity-100"
                        icon={<MoreVertical className="w-4 h-4" />}
                        align="right"
                        showChevron={false}
                        menuWidth="w-40"
                        items={[
                            {
                                label: 'Zmień nazwę',
                                icon: <Edit2 className="w-4 h-4" />,
                                onClick: () => setIsEditing(true)
                            },
                            {
                                label: 'Usuń',
                                icon: <Trash2 className="w-4 h-4" />,
                                onClick: () => onRemove(scene.id),
                                danger: true
                            }
                        ]}
                    />
                </div>
            ) : (
                <div className="w-8 h-8 flex items-center justify-center text-neutral-700" title="Element systemowy">
                     <Lock className="w-4 h-4" />
                </div>
            )}
        </div>
    )
}
