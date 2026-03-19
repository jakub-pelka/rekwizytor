'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    DropAnimation,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Check } from 'lucide-react'
import { updatePropPosition, updatePropName, updatePropStatus } from '@/app/actions/performance-props'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'


type Prop = {
    id: string
    item_name: string
    is_checked: boolean | null
    created_at: string | null
    performance_id: string
    sort_order?: number | null
    column_index?: number | null
}

type Props = {
    readonly performanceId: string
    readonly initialProps: Prop[]
    readonly variant?: 'manage' | 'checklist'
    readonly onDelete?: (id: string) => void
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
}

function SortablePropItem({
    prop,
    isOverlay,
    variant,
    onToggleCheck,
    onDelete,
    onUpdateName
}: {
    readonly prop: Prop
    readonly isOverlay?: boolean
    readonly variant: 'manage' | 'checklist'
    readonly onToggleCheck?: (id: string, current: boolean) => void
    readonly onDelete?: (id: string) => void
    readonly onUpdateName?: (id: string, name: string) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(prop.item_name)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: prop.id, disabled: isEditing })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const handleBlur = () => {
        setIsEditing(false)
        if (tempName !== prop.item_name && tempName.trim()) {
            onUpdateName?.(prop.id, tempName.trim())
        } else {
            setTempName(prop.item_name)
        }
    }

    if (isOverlay) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-600 bg-neutral-800 shadow-2xl">
                <GripVertical className="w-4 h-4 text-neutral-400" />
                <span className="text-white font-medium">{prop.item_name}</span>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition-all mb-2 touch-manipulation"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-neutral-600 hover:text-neutral-400 p-1">
                <GripVertical className="w-4 h-4" />
            </div>

            {variant === 'checklist' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation() // Prevent drag start interference if clicked carefully? actually listener is on grip
                        onToggleCheck?.(prop.id, prop.is_checked || false)
                    }}
                    className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${prop.is_checked
                        ? 'border-transparent bg-burgundy-main'
                        : 'border-neutral-600 hover:border-neutral-500'
                        }`}
                >
                    {prop.is_checked && <Check className="h-3 w-3 text-white" />}
                </button>
            )}

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBlur()
                            if (e.key === 'Escape') {
                                setTempName(prop.item_name)
                                setIsEditing(false)
                            }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => {
                            if (variant === 'manage') {
                                setTempName(prop.item_name)
                                setIsEditing(true)
                            }
                        }}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && variant === 'manage') {
                                e.preventDefault()
                                setTempName(prop.item_name)
                                setIsEditing(true)
                            }
                        }}
                        role={variant === 'manage' ? "button" : undefined}
                        tabIndex={variant === 'manage' ? 0 : undefined}
                        className={`block w-full text-sm font-medium truncate ${variant === 'manage' ? 'cursor-text hover:text-amber-400 transition-colors' : ''} ${variant === 'checklist' && prop.is_checked ? 'text-neutral-500 line-through' : 'text-white'
                            }`}
                    >
                        {prop.item_name}
                    </span>
                )}
            </div>

            {variant === 'manage' && !isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onDelete?.(prop.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    )
}

export function PropsKanbanBoard({ performanceId, initialProps, variant = 'checklist', onDelete }: Props) {
    const [props, setProps] = useState<Prop[]>(initialProps)
    const [activeId, setActiveId] = useState<string | null>(null)
    const pendingUpdates = useRef<Record<string, { column_index: number; sort_order: number }>>({})
    const saveTimeout = useRef<NodeJS.Timeout | null>(null)
    const t = useTranslations('Notifications')

    // Ensure we have correct initial state distribution
    // Fallback: if no column_index, distribute evenly or put in 0?
    // Let's rely on DB default 0.

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        setProps(initialProps)
    }, [initialProps])

    const columns = useMemo(() => {
        const cols: Record<number, Prop[]> = { 0: [], 1: [] }

        // Sort by sort_order, then created_at as fallback
        const sorted = [...props].sort((a, b) => {
            const orderA = a.sort_order ?? 0
            const orderB = b.sort_order ?? 0
            if (orderA !== orderB) return orderA - orderB
            return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        })

        // Distribute evenly: odd indices to column 0, even indices to column 1
        // If odd number of items, left column gets one more
        sorted.forEach((p, index) => {
            const col = index % 2 // 0 for even (left), 1 for odd (right)
            cols[col].push(p)
        })

        return cols
    }, [props])


    const saveChanges = async () => {
        const updates = pendingUpdates.current
        const ids = Object.keys(updates)
        if (ids.length === 0) return

        console.log('Saving prop positions:', ids.length)

        // Clear pending immediately to avoid double save
        pendingUpdates.current = {}

        try {
            await Promise.all(ids.map(id => updatePropPosition(id, performanceId, updates[id])))
        } catch (e) {
            console.error('Failed to save prop positions', e)
            notify.error(t('positionSaveError'))
        }
    }

    const scheduleSave = () => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(saveChanges, 2000) // 2 sec debounce
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        // Visual-only columns - no cross-column dragging needed
        // Items are automatically distributed after reordering
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Skip if dropping on column container
        if (overId.startsWith('col-')) return

        // Find the old and new positions in the FULL sorted list
        const sorted = [...props].sort((a, b) => {
            const orderA = a.sort_order ?? 0
            const orderB = b.sort_order ?? 0
            if (orderA !== orderB) return orderA - orderB
            return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        })

        const oldIndex = sorted.findIndex(i => i.id === activeId)
        const newIndex = sorted.findIndex(i => i.id === overId)

        if (oldIndex !== newIndex) {
            const newOrder = arrayMove(sorted, oldIndex, newIndex)

            // Update all items with new sort_order
            setProps(newOrder.map((p, idx) => ({
                ...p,
                sort_order: idx
            })))

            // Add to pending updates
            newOrder.forEach((p, idx) => {
                pendingUpdates.current[p.id] = {
                    column_index: 0, // Not used anymore, but keep for DB compatibility
                    sort_order: idx
                }
            })
            scheduleSave()
        }
    }

    const handleUpdateName = async (id: string, name: string) => {
        // Optimistic
        setProps(prev => prev.map(p => p.id === id ? { ...p, item_name: name } : p))

        try {
            await updatePropName(id, name, performanceId)
            notify.success(t('nameUpdated'))
        } catch (error) {
            console.error('Failed to update prop name:', error)
            notify.error(t('updateError'))
        }
    }

    const handleToggleCheck = async (id: string, current: boolean) => {
        setProps(prev => prev.map(p => p.id === id ? { ...p, is_checked: !current } : p))

        try {
            await updatePropStatus(id, !current)
        } catch (error) {
            console.error('Failed to toggle prop status:', error)
            notify.error(t('checkboxUpdateError'))
            // Revert
            setProps(prev => prev.map(p => p.id === id ? { ...p, is_checked: current } : p))
        }
    }

    // Column component - visual only, no droppable needed
    const Column = ({ id, items }: { id: string | number, items: Prop[] }) => {
        return (
            <div className="flex flex-col gap-2 min-h-[60px] bg-neutral-900/20 rounded-xl p-3 border border-neutral-800/50">
                <SortableContext
                    id={`col-${id}`}
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map(prop => (
                        <SortablePropItem
                            key={prop.id}
                            prop={prop}
                            variant={variant}
                            onToggleCheck={handleToggleCheck}
                            onDelete={onDelete}
                            onUpdateName={handleUpdateName}
                        />
                    ))}
                    {items.length === 0 && (
                        <div className="flex items-center justify-center text-neutral-600 text-sm border-2 border-dashed border-neutral-800/50 rounded-lg p-4">
                            Pusta kolumna
                        </div>
                    )}
                </SortableContext>
            </div>
        )
    }

    const activeProp = useMemo(() => props.find(p => p.id === activeId), [activeId, props])

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <Column id={0} items={columns[0]} />
                <div>
                    <Column id={1} items={columns[1]} />
                </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeProp ? (
                    <SortablePropItem
                        prop={activeProp}
                        isOverlay
                        variant={variant}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
