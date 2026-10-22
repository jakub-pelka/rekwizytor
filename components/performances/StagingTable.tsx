'use client'

import { useState, useMemo, useEffect } from 'react'
import { ScannedScene } from '@/app/actions/scan-scenes'
import { Trash2, GripVertical, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Props = {
    scannedScenes: ScannedScene[]
    existingScenes: { act: number, number: number }[]
    imageUrls: string[]
    onUpdate: (index: number, updates: Partial<ScannedScene>) => void
    onRemove: (index: number) => void
    onReorder: (newScenes: ScannedScene[]) => void
}

export function StagingTable({ scannedScenes, existingScenes, imageUrls, onUpdate, onRemove, onReorder }: Props) {
    const t = useTranslations('SceneImport')
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [activeId, setActiveId] = useState<string | null>(null)

    // Group scenes by Act
    // We need to keep track of the original indexes to call onUpdate/onRemove correctly
    // or we just manipulate the full list based on IDs.
    // Using IDs is safer for reordering.

    const acts = useMemo(() => {
        const uniqueActs = Array.from(new Set(scannedScenes.map(s => s.act_number ?? 1))).sort((a, b) => a - b)
        if (uniqueActs.length === 0) return [1]
        return uniqueActs
    }, [scannedScenes])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require drag 8px to start, allows clicking inputs
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over) return

        // const activeScene = scannedScenes.find(s => s._id === active.id)
        // if (!activeScene) return

        // If dropping over a container (Act header/area)
        // const overId = over.id
        // Check if over is a scene or an act container
        // const isOverScene = scannedScenes.some(s => s._id === overId)

        // If over another scene, we let dragEnd handle ordering if in same container.
        // If in different containers, we need to move it to the new container's group in scannedScenes?
        // Actually, DndKit examples usually handle this in dragOver for visual feedback.
    }

    // Calculate starting offsets for each Act based on existing scenes
    const actOffsets = useMemo(() => {
        const offsets: Record<number, number> = {}
        existingScenes.forEach(s => {
            offsets[s.act] = Math.max(offsets[s.act] || 0, s.number)
        })
        return offsets
    }, [existingScenes])

    // Auto-sequence on mount/update to ensure consistency
    useEffect(() => {
        if (scannedScenes.length === 0) return

        // Check if we need to re-sequence (e.g. if numbers collide with existing)
        // Or just force enforce sequential order always?
        // Let's enforce it to be safe.

        const newScenes = [...scannedScenes]
        let hasChanges = false

        const uniqueActs = Array.from(new Set(newScenes.map(s => s.act_number ?? 1)))

        uniqueActs.forEach(act => {
            const startOffset = actOffsets[act] || 0
            const actScenes = newScenes.filter(s => (s.act_number ?? 1) === act)
            actScenes.forEach((scene: ScannedScene, index: number) => {
                const expectedNumber = act === 0 ? index : startOffset + index + 1
                if (scene.scene_number !== expectedNumber) {
                    const realIndex = newScenes.findIndex(s => s._id === scene._id)
                    if (realIndex !== -1) {
                        newScenes[realIndex] = { ...newScenes[realIndex], scene_number: expectedNumber }
                        hasChanges = true
                    }
                }
            })
        })

        if (hasChanges) {
            onReorder(newScenes)
        }
    }, [scannedScenes.length, actOffsets]) // Dependency on length mainly, to trigger on load. avoiding infinite loop with onReorder

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeScene = scannedScenes.find(s => s._id === active.id)
        if (!activeScene) return

        // Identification
        const isOverContainer = acts.some(act => `act-${act}` === over.id)
        const isOverScene = scannedScenes.some(s => s._id === over.id)

        let newScenes = [...scannedScenes]

        if (isOverContainer) {
            // Dropped on an Act header/container -> Move to that Act
            const actNumber = parseInt(over.id.toString().replace('act-', ''))

            // Update act number of the active scene
            if (activeScene.act_number !== actNumber) {
                const sceneIndex = newScenes.findIndex(s => s._id === active.id)
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], act_number: actNumber }
            }
        }
        else if (isOverScene) {
            // Dropped on another scene
            const overScene = scannedScenes.find(s => s._id === over.id)
            if (!overScene) return

            const oldIndex = newScenes.findIndex(s => s._id === active.id)
            const newIndex = newScenes.findIndex(s => s._id === over.id)

            // If moving between Acts (dragging scene A (Act 1) onto scene B (Act 2))
            if (activeScene.act_number !== overScene.act_number) {
                newScenes[oldIndex] = { ...newScenes[oldIndex], act_number: overScene.act_number }
            }
            // Reorder in the flat array
            newScenes = arrayMove(newScenes, oldIndex, newIndex)
        }

        // Auto-sequence scene numbers per Act
        const uniqueActsInNewScenes = Array.from(new Set(newScenes.map((s: ScannedScene) => s.act_number || 1))).sort((a: number, b: number) => a - b)

        uniqueActsInNewScenes.forEach((act: number) => {
            const startOffset = actOffsets[act] || 0
            // Get all scenes for this act, preserving their relative order in the newScenes array
            const actScenes = newScenes.filter((s: ScannedScene) => (s.act_number ?? 1) === act)

            // Update their scene numbers sequentially
            actScenes.forEach((scene: ScannedScene, index: number) => {
                const realIndex = newScenes.findIndex((s: ScannedScene) => s._id === scene._id)
                if (realIndex !== -1) {
                    const expectedNumber = act === 0 ? index : startOffset + index + 1
                    newScenes[realIndex] = { ...newScenes[realIndex], scene_number: expectedNumber }
                }
            })
        })

        onReorder(newScenes)
    }

    const isConflict = (act: number | null, number: number) => {
        if (act === null) return false
        return existingScenes.some(s => s.act === act && s.number === number)
    }

    return (
        <div className="flex flex-col gap-4 lg:flex-row">
            {/* Lewa strona: akty ze scenami do sprawdzenia */}
            <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-h-[60vh] lg:overflow-y-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    {acts.map(act => {
                        const scenesInAct = scannedScenes.filter(s => (s.act_number ?? 1) === act)

                        return (
                            <section key={act} className="pl-sect" aria-label={act === 0 ? t('preparation') : t('act', { n: act })}>
                                <SortableContext
                                    id={`act-${act}`} // This ID helps identify the container
                                    items={scenesInAct.map(s => s._id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="pl-sect-head pl-sect-head--rule">
                                        <h4 className="pl-h2">{act === 0 ? t('preparation') : t('act', { n: act })}</h4>
                                        <span className="rk-tally">{t('sceneCount', { count: scenesInAct.length })}</span>
                                    </div>
                                    <ul className="pl-list" id={`act-${act}`}>
                                        {scenesInAct.length === 0 && (
                                            <li className="pl-meta">{t('dropScenes')}</li>
                                        )}
                                        {scenesInAct.map((scene) => {
                                            // Find true index in main array for updates
                                            const index = scannedScenes.findIndex(s => s._id === scene._id)
                                            const conflict = isConflict(scene.act_number, scene.scene_number)

                                            return (
                                                <SortableRow
                                                    key={scene._id}
                                                    id={scene._id}
                                                    scene={scene}
                                                    index={index}
                                                    conflict={conflict}
                                                    onUpdate={onUpdate}
                                                    onRemove={onRemove}
                                                    onFocus={() => {
                                                        if (scene.source_index !== undefined) {
                                                            setActiveImageIndex(scene.source_index)
                                                        }
                                                    }}
                                                />
                                            )
                                        })}
                                    </ul>
                                </SortableContext>
                            </section>
                        )
                    })}

                    <DragOverlay>
                        {activeId ? (
                            <div className="rk-ai__item shadow-overlay">{t('moving')}</div>
                        ) : null}
                    </DragOverlay>

                </DndContext>
            </div>

            {/* Prawa strona: zdjęcie, z którego rozpoznano sceny */}
            <div className="flex flex-col gap-3 lg:w-[40%] lg:shrink-0">
                <div className="flex items-center justify-between">
                    <span className="rk-tally">{t('sourcePhoto')}</span>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="rk-btn rk-btn--ghost rk-btn--sm rk-btn--icon" aria-label={t('zoomOut')} title={t('zoomOut')}>
                            <ZoomOut />
                        </button>
                        <span className="rk-tally w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="rk-btn rk-btn--ghost rk-btn--sm rk-btn--icon" aria-label={t('zoomIn')} title={t('zoomIn')}>
                            <ZoomIn />
                        </button>
                    </div>
                </div>

                <div className="rk-ai__photo max-h-[50vh] overflow-auto lg:max-h-[52vh]">
                    {imageUrls.length > 0 ? (
                        <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }} className="relative mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrls[activeImageIndex]}
                                alt={t('sourceAlt', { n: activeImageIndex + 1 })}
                                className="block h-auto w-full select-none"
                            />
                        </div>
                    ) : (
                        <p className="pl-meta p-6 text-center">{t('noImage')}</p>
                    )}
                </div>

                {imageUrls.length > 1 && (
                    <div className="rk-chips">
                        {imageUrls.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImageIndex(idx)}
                                className="rk-chip"
                                aria-pressed={activeImageIndex === idx}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Wiersz sceny, który da się przeciągnąć
type RowProps = {
    id: string
    scene: ScannedScene
    index: number
    conflict: boolean
    onUpdate: Props['onUpdate']
    onRemove: Props['onRemove']
    onFocus: () => void
}

function SortableRow({ id, scene, index, conflict, onUpdate, onRemove, onFocus }: RowProps) {
    const t = useTranslations('SceneImport')
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <li ref={setNodeRef} style={style}>
            <button type="button" className="rk-btn rk-btn--ghost rk-btn--sm rk-btn--icon cursor-grab touch-none" aria-label={t('dragHandle')} {...attributes} {...listeners}>
                <GripVertical />
            </button>

            <span className={`rk-ai__n ${conflict ? 'rk-ai__n--low' : ''}`}>{scene.scene_number === 0 ? 'P' : scene.scene_number}</span>

            <div className="pl-main">
                <input
                    type="text"
                    value={scene.name || ''}
                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                    onFocus={onFocus}
                    aria-label={t('sceneName')}
                    placeholder={t('sceneName')}
                    className="rk-input"
                />
                {conflict && <small className="text-warning">{t('conflict', { n: scene.scene_number, act: scene.act_number ?? 1 })}</small>}
                {!conflict && scene.original_number != scene.scene_number && (
                    <small>{t('originalNumber', { n: scene.original_number })}</small>
                )}
            </div>

            <button
                type="button"
                onClick={() => onRemove(index)}
                className="rk-btn rk-btn--ghost rk-btn--sm rk-btn--icon"
                aria-label={t('removeScene')}
                title={t('removeScene')}
            >
                <Trash2 />
            </button>
        </li>
    )
}
