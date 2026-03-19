'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { Folder, ChevronRight, ChevronDown, Edit2, Trash2, CheckSquare, Square } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon'> & {
        locations: { id: string; name: string } | null
        items_count?: number
    }

type Location = { id: string; name: string }

interface GroupManagerProps {
    readonly initialGroups: Group[]
    readonly locations: Location[]
}

export function GroupManager({ initialGroups, locations }: GroupManagerProps) {
    const [groups, setGroups] = useState(initialGroups)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expandedLocs, setExpandedLocs] = useState<Record<string, boolean>>({})
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editLocationId, setEditLocationId] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    // Initialize expanded all
    useState(() => {
        const init: Record<string, boolean> = {}
        locations.forEach(l => init[l.name] = true)
        init['Unassigned'] = true
        setExpandedLocs(init)
    })

    // Grouping
    const grouped = groups.reduce((acc, g) => {
        const locName = g.locations?.name || 'Unassigned'
        if (!acc[locName]) acc[locName] = []
        acc[locName].push(g)
        return acc
    }, {} as Record<string, Group[]>)

    const sortedLocs = Object.keys(grouped).sort((a, b) => {
        if (a === 'Unassigned') return 1
        if (b === 'Unassigned') return -1
        return a.localeCompare(b)
    })

    // Actions
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const toggleSelectAllCat = (locName: string) => {
        const groupIds = grouped[locName].map(g => g.id)
        const allSelected = groupIds.every(id => selectedIds.has(id))
        const newSet = new Set(selectedIds)

        if (allSelected) {
            groupIds.forEach(id => newSet.delete(id))
        } else {
            groupIds.forEach(id => newSet.add(id))
        }
        setSelectedIds(newSet)
    }

    const deleteGroups = async (ids: string[]) => {
        if (!confirm(`Czy na pewno usunąć ${ids.length} grup?`)) return
        try {
            const { error } = await supabase.from('groups').delete().in('id', ids)
            if (error) throw error
            setGroups(prev => prev.filter(g => !ids.includes(g.id)))
            setSelectedIds(prev => {
                const next = new Set(prev)
                ids.forEach(id => next.delete(id))
                return next
            })
            notify.success('Usunięto grupy')
            router.refresh()
        } catch (e) {
            console.error(e)
            notify.error('Błąd usuwania (sprawdź czy grupy są puste)')
        }
    }

    const startEdit = (g: Group) => {
        setEditingId(g.id)
        setEditName(g.name)
        setEditLocationId(g.locations?.id || 'null')
    }

    const saveEdit = async () => {
        if (!editingId) return
        try {
            const updates: any = { name: editName }
            if (editLocationId && editLocationId !== 'null') updates.location_id = editLocationId
            else updates.location_id = null

            const { error } = await supabase.from('groups').update(updates).eq('id', editingId)
            if (error) throw error

            setGroups(prev => prev.map(g => {
                if (g.id === editingId) {
                    return {
                        ...g,
                        name: editName,
                        locations: editLocationId !== 'null' ? locations.find(l => l.id === editLocationId) || null : null
                    }
                }
                return g
            }))
            setEditingId(null)
            notify.success('Zapisano')
            router.refresh()
        } catch (e) {
            console.error(e)
            notify.error('Błąd zapisu')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                    <span className="text-blue-200 text-sm font-medium">Zaznaczono: {selectedIds.size}</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => deleteGroups(Array.from(selectedIds))}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Usuń zaznaczone
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSelectedIds(new Set())}>
                            Anuluj
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {sortedLocs.map(locName => (
                    <div key={locName} className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-neutral-900/60 flex items-center gap-3 border-b border-neutral-800">
                            <button onClick={() => toggleSelectAllCat(locName)} className="text-neutral-500 hover:text-white">
                                {grouped[locName].every(g => selectedIds.has(g.id)) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setExpandedLocs(prev => ({ ...prev, [locName]: !prev[locName] }))}
                                className="flex-1 flex items-center gap-2 font-medium text-neutral-300 hover:text-white text-left"
                            >
                                <span className="uppercase text-xs tracking-wider font-bold text-neutral-500">{locName}</span>
                                <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400">{grouped[locName].length}</span>
                            </button>
                        </div>

                        {expandedLocs[locName] && (
                            <div className="divide-y divide-neutral-800/50">
                                {grouped[locName].map(group => {
                                    const isSelected = selectedIds.has(group.id)
                                    const isEditing = editingId === group.id

                                    // Icon resolution
                                    const IconComp = group.icon && group.icon in LucideIcons
                                        ? LucideIcons[group.icon as keyof typeof LucideIcons]
                                        : Folder

                                    return (
                                        <div key={group.id} className={`flex items-center gap-3 p-3 transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-neutral-800/30'}`}>
                                            <button onClick={() => toggleSelect(group.id)} className={`text-neutral-600 hover:text-white ${isSelected && 'text-blue-400'}`}>
                                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                            </button>

                                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                                                {/* @ts-ignore */}
                                                <IconComp className="w-4 h-4" />
                                            </div>

                                            {isEditing ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white flex-1"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                    />
                                                    <select
                                                        value={editLocationId || 'null'}
                                                        onChange={e => setEditLocationId(e.target.value)}
                                                        className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white"
                                                    >
                                                        <option value="null">Brak lokalizacji</option>
                                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>

                                                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>X</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-white truncate">{group.name}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => startEdit(group)} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => deleteGroups([group.id])} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
} 
