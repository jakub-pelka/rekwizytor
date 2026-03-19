'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { KanbanBoard, KanbanColumn } from '@/components/ui/KanbanBoard'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'
import { Folder, Trash2, GripVertical, Plus, X } from 'lucide-react'
import { Database } from '@/types/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getIconComponent } from '@/utils/icon-map'
import { getSuggestedIcon } from '@/utils/icon-matcher'
import { Button } from '@/components/ui/Button'
import { EditGroupIconDialog } from './EditGroupIconDialog'

type Group = Pick<Database['public']['Tables']['groups']['Row'], 'id' | 'name' | 'icon' | 'location_id'>

type Props = {
    readonly initialGroups: Group[]
    readonly locations: readonly { readonly id: string; readonly name: string }[]
}

// Reuse similar card style from SceneKanbanBoard for persistent groups
const GroupKanbanCard = ({
    group,
    isOverlay,
    onDelete,
    onEdit,
    onUpdate
}: {
    readonly group: Group,
    readonly isOverlay?: boolean,
    readonly onDelete: (id: string) => void,
    readonly onEdit: (group: Group) => void,
    readonly onUpdate: (id: string, updates: Partial<Group>) => void
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(group.name || '')

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: group.id, disabled: isEditing })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const Icon = getIconComponent(group.icon || 'Folder') || Folder

    const handleBlur = () => {
        setIsEditing(false)
        if (tempName !== group.name && tempName.trim()) {
            onUpdate(group.id, { name: tempName.trim() })
        } else {
            setTempName(group.name || '')
        }
    }

    if (isOverlay) {
        return (
            <div className="p-4 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl opacity-90 text-white font-medium w-[300px] flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-white">
                    <Icon className="w-4 h-4" />
                </div>
                <span>{group.name}</span>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/80 hover:border-neutral-700 transition-all shadow-sm"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-neutral-600 hover:text-neutral-400 p-1">
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Icon Badge - Clicking it opens icon selector */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onEdit(group)
                }}
                className="w-8 h-8 shrink-0 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 transition-all group/icon shadow-inner"
                title="Zmień ikonę"
            >
                <Icon className="w-4 h-4" />
            </button>

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
                                setTempName(group.name || '')
                                setIsEditing(false)
                            }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => {
                            setTempName(group.name || '')
                            setIsEditing(true)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setTempName(group.name || '')
                                setIsEditing(true)
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        className="block w-full text-sm text-white font-medium truncate cursor-text hover:text-amber-400 transition-colors"
                    >
                        {group.name}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(group.id)
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}

const STORAGE_KEY = 'group_kanban_pending_updates'

export function GroupKanbanManager({ initialGroups, locations: initialLocations }: Props) {
    const [groups, setGroups] = useState<Group[]>(initialGroups)
    // Locations state to handle updates/adds
    const [locations, setLocations] = useState(initialLocations)
    const [editGroup, setEditGroup] = useState<Group | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [, setHasPendingChanges] = useState(false)
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
    const [tempColumnName, setTempColumnName] = useState('')

    // Pending updates ref: Map<GroupId, Partial<Group>>
    const pendingUpdates = useRef<Record<string, Partial<Group>>>({})
    const saveTimeout = useRef<NodeJS.Timeout | null>(null)
    const isUnmounting = useRef(false)

    const supabase = createClient()
    const router = useRouter()

    const COL_UNASSIGNED = 'unassigned'

    // Define columns: Unassigned + Locations
    const columns: KanbanColumn[] = [
        { id: COL_UNASSIGNED, title: 'Nieprzypisane' },
        ...locations.map(l => ({ id: l.id, title: l.name }))
    ]

    const kanbanItems = useMemo(() => {
        return groups.map(g => ({
            ...g,
            columnId: g.location_id || COL_UNASSIGNED
        }))
    }, [groups])

    // Main function to save changes to DB
    const savePendingChanges = useCallback(async () => {
        const updates = pendingUpdates.current
        const idsToUpdate = Object.keys(updates)

        if (idsToUpdate.length === 0) return

        console.log('Saving batch updates:', idsToUpdate.length)

        try {
            const promises = idsToUpdate.map(id => {
                const patch = updates[id]
                return supabase.from('groups').update(patch).eq('id', id)
            })

            await Promise.all(promises)

            // Clear pending updates only on success
            pendingUpdates.current = {}
            localStorage.removeItem(STORAGE_KEY)

            // Signal to other pages that groups were updated
            sessionStorage.setItem('groups_updated', Date.now().toString())

            if (!isUnmounting.current) {
                setHasPendingChanges(false)
                notify.success('Zapisano zmiany')
                router.refresh()
            }
        } catch (error) {
            console.error('Batch save error:', error)
            if (!isUnmounting.current) {
                notify.error('Błąd zapisu zmian')
            }
        }
    }, [supabase, router])

    // Schedule save with debounce
    const scheduleSave = useCallback(() => {
        setHasPendingChanges(true)
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current)
        }
        // Save after 30 seconds of inactivity
        saveTimeout.current = setTimeout(() => {
            savePendingChanges()
        }, 30000)
    }, [savePendingChanges])

    // Handle updates (manual or drag)
    const handleGroupUpdate = useCallback((id: string, updates: Partial<Group>) => {
        // 1. Optimistic local update
        setGroups(prev => prev.map(g =>
            g.id === id ? { ...g, ...updates } : g
        ))

        // 2. Add to pending
        pendingUpdates.current[id] = {
            ...(pendingUpdates.current[id] || {}),
            ...updates
        }

        // 3. Backup to LocalStorage immediately
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingUpdates.current))

        // 4. Schedule save
        scheduleSave()
    }, [scheduleSave])

    // Unmount cleanup
    useEffect(() => {
        isUnmounting.current = false

        // Check for backup on mount
        const backup = localStorage.getItem(STORAGE_KEY)
        if (backup) {
            try {
                const parsedUpdates = JSON.parse(backup) as Record<string, Partial<Group>>
                const keys = Object.keys(parsedUpdates)

                if (keys.length > 0) {
                    console.log('Restoring pending updates from storage:', keys.length)

                    // Merge into pending
                    pendingUpdates.current = { ...pendingUpdates.current, ...parsedUpdates }

                    // Apply to local state
                    setGroups(prev => prev.map(g => {
                        const update = parsedUpdates[g.id]
                        return update ? { ...g, ...update } : g
                    }))

                    setHasPendingChanges(true)
                    notify.success('Przywrócono niezapisane zmiany')

                    // Trigger save
                    savePendingChanges()
                }
            } catch (e) {
                console.error('Failed to parse pending updates backup', e)
            }
        }

        return () => {
            isUnmounting.current = true
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current)
            }
            // Attempt to save immediately on unmount
            if (Object.keys(pendingUpdates.current).length > 0) {
                // Save to LS one last time just in case async save fails
                localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingUpdates.current))
                savePendingChanges()
            }
        }
    }, [savePendingChanges])

    const handleReorder = useCallback((newItems: typeof kanbanItems) => {
        // Detect changes based on columns
        const changedItems = newItems.filter(item => {
            const old = groups.find(g => g.id === item.id)
            if (!old) return false
            const newLocId = item.columnId === COL_UNASSIGNED ? null : String(item.columnId)
            return old.location_id !== newLocId
        })

        if (changedItems.length === 0) return

        // Update local state and pending buffer for each moved item
        changedItems.forEach(item => {
            const newLocId = item.columnId === COL_UNASSIGNED ? null : String(item.columnId)
            handleGroupUpdate(item.id, { location_id: newLocId })
        })
    }, [groups, handleGroupUpdate])

    const deleteGroup = async (id: string) => {
        if (!confirm('Czy na pewno usunąć grupę?')) return
        try {
            const { error } = await supabase.from('groups').delete().eq('id', id)
            if (error) throw error

            // Remove from updates if present
            delete pendingUpdates.current[id]

            setGroups(prev => prev.filter(g => g.id !== id))
            notify.success('Usunięto grupę')
            router.refresh()
        } catch (e) {
            console.error(e)
            notify.error('Błąd usuwania')
        }
    }

    // Location management
    const handleLocationUpdate = async (id: string, newName: string) => {
        if (!newName.trim()) return

        // Optimistic update
        setLocations(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l))
        setEditingColumnId(null)

        try {
            const { error } = await supabase.from('locations').update({ name: newName }).eq('id', id)
            if (error) throw error
            notify.success('Zmieniono nazwę lokalizacji')
            // Don't need router refresh here as we have local state
        } catch (e) {
            console.error(e)
            notify.error('Błąd zmiany nazwy')
        }
    }

    const handleAddLocation = async () => {
        const name = prompt('Podaj nazwę nowego pomieszczenia:')
        if (!name) return

        try {
            const { data, error } = await supabase.from('locations').insert({ name }).select().single()
            if (error) throw error
            if (data) {
                setLocations(prev => [...prev, data])
                notify.success('Dodano pomieszczenie')
                router.refresh()
            }
        } catch (e) {
            console.error(e)
            notify.error('Błąd dodawania')
        }
    }

    const openEdit = (group: Group) => {
        setEditGroup(group)
        setIsEditDialogOpen(true)
    }

    const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null)

    // Save when mouse leaves the Kanban area
    const handleMouseLeave = useCallback(() => {
        if (Object.keys(pendingUpdates.current).length > 0) {
            console.log('Mouse left Kanban, saving pending changes')
            savePendingChanges()
        }
    }, [savePendingChanges])

    const handleDeleteLocation = async (id: string) => {
        setDeleteLocationId(null) // Close modal first
        try {
            // 1. Update all groups locally to remove location
            setGroups(prev => prev.map(g =>
                g.location_id === id ? { ...g, location_id: null } : g
            ))

            // 2. Remove location locally
            setLocations(prev => prev.filter(l => l.id !== id))

            // 3. Database operations
            // First, unassign groups in DB (update where location_id is id)
            // Note: RLS might handle this if cascade is set, but better safe.
            const { error: groupsError } = await supabase
                .from('groups')
                .update({ location_id: null })
                .eq('location_id', id)

            if (groupsError) throw groupsError

            // Then delete location
            const { error: locError } = await supabase
                .from('locations')
                .delete()
                .eq('id', id)

            if (locError) throw locError

            notify.success('Usunięto miejsce')
            router.refresh()
        } catch (e) {
            console.error(e)
            notify.error('Błąd usuwania miejsca')
            // Optionally revert local state here if strict consistency needed, 
            // but refresh usually fixes it.
            router.refresh()
        }
    }

    const renderColumnHeader = (col: KanbanColumn, items: any[]) => {
        if (col.id === COL_UNASSIGNED) {
            return (
                <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/50 rounded-t-lg">
                    <span className="font-medium text-neutral-400 text-sm truncate pr-2">{col.title}</span>
                    <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full shrink-0">
                        {items.length}
                    </span>
                </div>
            )
        }

        const isEditing = editingColumnId === String(col.id)

        return (
            <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/50 rounded-t-lg group/header">
                {isEditing ? (
                    <input
                        type="text"
                        value={tempColumnName}
                        onChange={(e) => setTempColumnName(e.target.value)}
                        onBlur={() => handleLocationUpdate(String(col.id), tempColumnName)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLocationUpdate(String(col.id), tempColumnName)
                            if (e.key === 'Escape') setEditingColumnId(null)
                        }}
                        autoFocus
                        className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded px-1 py-0.5 w-[200px] focus:outline-none focus:border-amber-500"
                    />
                ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span
                            onClick={() => {
                                setTempColumnName(col.title || '')
                                setEditingColumnId(String(col.id))
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setTempColumnName(col.title || '')
                                    setEditingColumnId(String(col.id))
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            className="font-medium text-neutral-300 text-sm truncate cursor-pointer hover:text-white transition-colors"
                            title="Kliknij aby edytować nazwę"
                        >
                            {col.title}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
                        {items.length}
                    </span>
                    {!isEditing && (
                        <button
                            onClick={() => setDeleteLocationId(String(col.id))}
                            className="p-1 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover/header:opacity-100"
                            title="Usuń miejsce"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            className="h-auto min-h-[500px] w-full pb-12 relative flex flex-col"
            onMouseLeave={handleMouseLeave}
        >
            {/* Header with Save Button */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="text-sm text-neutral-500">
                    Kliknij nazwę kolumny aby ją edytować. Przeciągnij karty aby zmienić lokalizację.
                </div>


            </div>

            <KanbanBoard
                items={kanbanItems}
                columns={columns}
                renderItem={(item, isOverlay) => (
                    <GroupKanbanCard
                        key={item.id}
                        group={item}
                        isOverlay={isOverlay}
                        onDelete={deleteGroup}
                        onEdit={openEdit}
                        onUpdate={handleGroupUpdate}
                    />
                )}
                renderColumnHeader={renderColumnHeader}
                onItemReorder={handleReorder}
                extraActions={
                    <div className="w-[320px] h-full pt-[52px] shrink-0"> {/* Adjusted top padding to align below headers */}
                        <button
                            onClick={handleAddLocation}
                            className="w-full h-[150px] border-2 border-dashed border-neutral-800 rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-900/50 transition-all gap-2"
                        >
                            <Plus className="w-6 h-6" />
                            <span className="font-medium text-sm">Dodaj nowe miejsce</span>
                        </button>
                    </div>
                }
            />

            <EditGroupIconDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                group={editGroup}
            />

            {deleteLocationId && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Usuwanie miejsca</h3>
                            <p className="text-neutral-400 mb-6">
                                Czy na pewno chcesz usunąć to miejsce?
                                <br />
                                <span className="text-amber-500 text-sm mt-2 block">
                                    Wszystkie grupy przypisane do tego miejsca zostaną przeniesione do "Nieprzypisane".
                                </span>
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="primary" // Emphasize CANCEL as requested ("podkreślić przycisk anuluj")
                                    onClick={() => setDeleteLocationId(null)}
                                >
                                    Anuluj
                                </Button>
                                <button
                                    onClick={() => deleteLocationId && handleDeleteLocation(deleteLocationId)} // Function needs to be defined
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                >
                                    Usuń miejsce
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
