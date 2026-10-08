'use client'

import { Fragment, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronRight, GripVertical, Layers, LoaderCircle } from 'lucide-react'
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCorners,
    pointerWithin,
    useDroppable,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type PointerSensorOptions,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { GROUP_STATUS, statusCountLabel } from '@/components/rk/GroupStatus'
import { groupAlert, sortGroups, sortLocations, type StorageData, type StorageGroup } from '@/lib/storage'
import { time } from '@/lib/rk-format'

type Props = { data: StorageData; roomId: string | null; canEdit: boolean }
type Columns = { id: string; title: string; groupIds: string[] }[]

const UNASSIGNED = 'unassigned'

// PointerSensor ograniczony do myszy/wskaźników nietapanych (pointerType !== 'touch'),
// aby TouchSensor mógł obsługiwać dotyk z przytrzymaniem 300 ms bez wyścigu sensorów.
class MousePointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown' as const,
            handler: ({ nativeEvent: event }: PointerEvent, { onActivation }: PointerSensorOptions) => {
                if (!event.isPrimary || event.button !== 0 || event.pointerType === 'touch') {
                    return false
                }
                onActivation?.({ event })
                return true
            },
        },
    ]
}

function SortableCard({
    group,
    columnId,
    canEdit,
    columns,
    onMove,
    isBeingDragged,
    t,
}: {
    group: StorageGroup
    columnId: string
    canEdit: boolean
    columns: Columns
    onMove: (groupId: string, toColumn: string, toIndex: number) => void
    isBeingDragged: boolean
    t: ReturnType<typeof useTranslations<'Organize'>>
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useSortable({
        id: group.id,
        disabled: !canEdit,
    })

    const a = groupAlert(group)
    const meta = [
        group.approxCount != null && `${t('general')} · ${t('approx', { count: group.approxCount })}`,
        group.items.length > 0 && t('itemized', { count: group.items.length }),
    ]
        .filter(Boolean)
        .join(' · ')

    const moveTargets = columns.filter(c => c.id !== columnId)

    return (
        <li
            ref={setNodeRef}
            className="rk-inv-card"
            style={{ opacity: isBeingDragged ? 0.3 : undefined }}
        >
            <span
                ref={setActivatorNodeRef}
                className="rk-inv-grip"
                style={{ touchAction: 'none' }}
                {...(canEdit ? attributes : {})}
                {...(canEdit ? listeners : {})}
            >
                <GripVertical aria-hidden="true" />
            </span>
            <span className="rk-inv-ico rk-inv-ico--group">
                <Layers />
            </span>
            <span className="rk-inv-text">
                <b>{group.name}</b>
                <small>
                    {group.code && <span className="rk-id">{group.code}</span>}
                    {meta && ` · ${meta}`}
                </small>
                {a && (
                    <span className={`rk-badge rk-badge--${GROUP_STATUS[a.status].tone}`}>
                        {statusCountLabel(a.status, a.count)}
                    </span>
                )}
            </span>
            {/* Alternatywa bez przeciągania (dotyk, klawiatura). */}
            {canEdit && moveTargets.length > 0 && (
                <ActionMenu
                    label={t('moveTo', { name: group.name })}
                    items={moveTargets.map(c => ({
                        type: 'button' as const,
                        label: c.title,
                        onSelect: () => onMove(group.id, c.id, Number.MAX_SAFE_INTEGER),
                    }))}
                />
            )}
        </li>
    )
}

function DroppableColumn({
    column,
    canEdit,
    columns,
    groupsById,
    drop,
    dragging,
    onMove,
    t,
}: {
    column: Columns[number]
    canEdit: boolean
    columns: Columns
    groupsById: Map<string, StorageGroup>
    drop: { column: string; index: number } | null
    dragging: string | null
    onMove: (groupId: string, toColumn: string, toIndex: number) => void
    t: ReturnType<typeof useTranslations<'Organize'>>
}) {
    const { setNodeRef } = useDroppable({ id: column.id, disabled: !canEdit })

    return (
        <div ref={setNodeRef} className="rk-inv-col">
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2">{column.title}</h2>
                <span className="rk-col__n">{column.groupIds.length}</span>
            </div>
            <SortableContext items={column.groupIds} strategy={verticalListSortingStrategy}>
                <ul className="rk-inv-cards">
                    {column.groupIds.map((id, i) => {
                        const g = groupsById.get(id)
                        if (!g) return null
                        return (
                            <Fragment key={id}>
                                {drop?.column === column.id && drop.index === i && dragging !== id && (
                                    <li className="rk-inv-drop">{t('dropHere')}</li>
                                )}
                                <SortableCard
                                    group={g}
                                    columnId={column.id}
                                    canEdit={canEdit}
                                    columns={columns}
                                    onMove={onMove}
                                    isBeingDragged={dragging === g.id}
                                    t={t}
                                />
                            </Fragment>
                        )
                    })}
                    {drop?.column === column.id && drop.index >= column.groupIds.length && (
                        <li className="rk-inv-drop">{t('dropHere')}</li>
                    )}
                </ul>
            </SortableContext>
        </div>
    )
}

// Porządkowanie (karta Porzadkowanie): przeciąganie grup między miejscami, zapis buforowany w tle.
// Kolumny i karty stoją w tej samej kolejności co sekcje i wiersze magazynu.
export function OrganizeBoard({ data, roomId, canEdit }: Props) {
    const t = useTranslations('Organize')
    const router = useRouter()
    const room = data.locations.find(l => l.id === roomId) ?? null
    const groupsById = new Map(data.groups.map(g => [g.id, g]))

    const [columns, setColumns] = useState<Columns>(() => {
        const containers = room ? sortLocations(data.locations.filter(l => l.parentId === room.id)) : []
        return [
            ...containers.map(c => ({ id: c.id, title: c.name, groupIds: sortGroups(data.groups.filter(g => g.locationId === c.id)).map(g => g.id) })),
            { id: UNASSIGNED, title: t('unassigned'), groupIds: sortGroups(data.groups.filter(g => !g.locationId)).map(g => g.id) },
        ]
    })
    const [dragging, setDragging] = useState<string | null>(null)
    const [drop, setDrop] = useState<{ column: string; index: number } | null>(null)
    const [saveState, setSaveState] = useState<{ pending: boolean; at: Date | null }>({ pending: false, at: null })
    const dirty = useRef(new Set<string>())
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const sensors = useSensors(
        useSensor(MousePointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const flush = useCallback(async () => {
        const cols = columnsRef.current
        const changed = [...dirty.current]
        dirty.current.clear()
        if (!changed.length) return
        setSaveState(s => ({ ...s, pending: true }))
        const supabase = createClient()
        const updates = cols.filter(c => changed.includes(c.id)).flatMap(c =>
            c.groupIds.map((id, i) => supabase.from('groups').update({ location_id: c.id === UNASSIGNED ? null : c.id, sort_order: i }).eq('id', id))
        )
        const results = await Promise.all(updates)
        if (results.some(r => r.error)) {
            changed.forEach(id => dirty.current.add(id))
            notify.error(t('saveFailed'))
            setSaveState(s => ({ ...s, pending: false }))
            return
        }
        setSaveState({ pending: false, at: new Date() })
    }, [t])

    const columnsRef = useRef(columns)
    useEffect(() => { columnsRef.current = columns }, [columns])

    const schedule = (ids: string[]) => {
        ids.forEach(id => dirty.current.add(id))
        setSaveState(s => ({ ...s, pending: true }))
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { void flush() }, 800)
    }

    const move = (groupId: string, toColumn: string, toIndex: number) => {
        let from = ''
        setColumns(prev => {
            const next = prev.map(c => ({ ...c, groupIds: [...c.groupIds] }))
            const source = next.find(c => c.groupIds.includes(groupId))!
            from = source.id
            const oldIndex = source.groupIds.indexOf(groupId)
            source.groupIds.splice(oldIndex, 1)
            const target = next.find(c => c.id === toColumn)!
            const index = source === target && oldIndex < toIndex ? toIndex - 1 : toIndex
            target.groupIds.splice(Math.max(0, Math.min(index, target.groupIds.length)), 0, groupId)
            return next
        })
        schedule([toColumn, from].filter(Boolean))
    }

    const done = async () => {
        if (timer.current) clearTimeout(timer.current)
        await flush()
        router.push(room ? `/groups?room=${room.id}` : '/groups')
        router.refresh()
    }

    const collisionDetection: CollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args)
        if (pointerCollisions.length > 0) {
            return pointerCollisions
        }
        return closestCorners(args)
    }, [])

    const handleDragStart = (event: DragStartEvent) => {
        setDragging(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) {
            return
        }

        const overId = over.id as string

        // 1. Kursor/palec nad konkretną kartą
        const cardCol = columns.find(c => c.groupIds.includes(overId))
        if (cardCol) {
            const cardIndex = cardCol.groupIds.indexOf(overId)
            const isBelow =
                active.rect.current.translated &&
                active.rect.current.translated.top + active.rect.current.translated.height / 2 >
                    over.rect.top + over.rect.height / 2
            const nextIndex = isBelow ? cardIndex + 1 : cardIndex
            setDrop({ column: cardCol.id, index: nextIndex })
            return
        }

        // 2. Kursor/palec nad kontenerem kolumny
        const col = columns.find(c => c.id === overId)
        if (col) {
            if (!col.groupIds.length) {
                setDrop({ column: col.id, index: 0 })
            } else if (drop?.column === col.id) {
                // Jeśli jesteśmy już w tej kolumnie (np. nad wskaźnikiem .rk-inv-drop) – zachowaj indeks
                return
            } else {
                setDrop({ column: col.id, index: col.groupIds.length })
            }
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active } = event
        if (active && drop) {
            move(active.id as string, drop.column, drop.index)
        }
        setDragging(null)
        setDrop(null)
    }

    const handleDragCancel = () => {
        setDragging(null)
        setDrop(null)
    }

    const cardMeta = (g: StorageGroup) =>
        [
            g.approxCount != null && `${t('general')} · ${t('approx', { count: g.approxCount })}`,
            g.items.length > 0 && t('itemized', { count: g.items.length }),
        ]
            .filter(Boolean)
            .join(' · ')

    const draggingGroup = dragging ? groupsById.get(dragging) : null
    const draggingAlert = draggingGroup ? groupAlert(draggingGroup) : null

    return (
        <div className="mx-auto flex max-w-[1184px] flex-col gap-8 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                <div>
                    <p className="rk-page-header__eyebrow">
                        <Link href="/groups" className="hover:text-ink">{t('storage')}</Link>
                        {room && <>{' › '}{room.name}</>}
                    </p>
                    <h1 className="rk-page-header__title">{t('title')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`rk-sync ${saveState.pending ? 'rk-sync--wait' : 'rk-sync--ok'}`} aria-live="polite">
                        {saveState.pending ? <LoaderCircle /> : <Check />}
                        {saveState.pending ? t('saving') : saveState.at ? t('savedAt', { time: time(saveState.at) }) : t('allSaved')}
                    </span>
                    <button type="button" className="rk-btn rk-btn--primary" onClick={done}>{t('done')}</button>
                </div>
            </header>

            <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('lead')}</p>

            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="rk-inv-board overflow-x-auto pb-4">
                    {columns.map(c => (
                        <DroppableColumn
                            key={c.id}
                            column={c}
                            canEdit={canEdit}
                            columns={columns}
                            groupsById={groupsById}
                            drop={drop}
                            dragging={dragging}
                            onMove={move}
                            t={t}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={null}>
                    {draggingGroup ? (
                        <div className="rk-inv-card is-lifted">
                            <span className="rk-inv-grip" aria-hidden="true">
                                <GripVertical />
                            </span>
                            <span className="rk-inv-ico rk-inv-ico--group">
                                <Layers />
                            </span>
                            <span className="rk-inv-text">
                                <b>{draggingGroup.name}</b>
                                <small>
                                    {draggingGroup.code && <span className="rk-id">{draggingGroup.code}</span>}
                                    {cardMeta(draggingGroup) && ` · ${cardMeta(draggingGroup)}`}
                                </small>
                                {draggingAlert && (
                                    <span className={`rk-badge rk-badge--${GROUP_STATUS[draggingAlert.status].tone}`}>
                                        {statusCountLabel(draggingAlert.status, draggingAlert.count)}
                                    </span>
                                )}
                            </span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Link className="pl-link" href={room ? `/groups?room=${room.id}` : '/groups'}>{t('back')}<ChevronRight /></Link>
        </div>
    )
}
