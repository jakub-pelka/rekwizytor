'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Loader2, Box, Search } from 'lucide-react'

interface Group {
    id: string
    name: string
    icon: string
    color: string
}

interface SelectGroupDialogProps {
    readonly locationId: string
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly onSelect: (groupId: string, groupName: string) => void
}

export function SelectGroupDialog({ locationId, isOpen, onClose, onSelect }: SelectGroupDialogProps) {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const supabase = createClient()

    useEffect(() => {
        if (isOpen) {
            fetchGroups()
        }
    }, [isOpen, locationId])

    const fetchGroups = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('groups')
            .select('id, name, icon, color')
            // Temporarily removed filter by location_id as groups might not be assigned yet
            // or logic for "groups in this room" might be different.
            // For now, showing all active groups to allow placing them here.
            .is('deleted_at', null)
            .order('name')

        if (data) {
            // Map nullable fields to string (or empty string fallback) to match Group interface
            const mappedGroups: Group[] = data.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon || 'Box', // Provide default icon if null
                color: g.color || '#cccccc' // Provide default color if null
            }))
            setGroups(mappedGroups)
        }
        setLoading(false)
    }

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Wybierz grupę do przypięcia">
            <div className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Szukaj grupy..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-neutral-700 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-burgundy-main"
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {(() => {
                        if (loading) {
                            return (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-burgundy-main" />
                                </div>
                            )
                        }
                        if (filteredGroups.length === 0) {
                            return (
                                <div className="text-center py-8 text-neutral-500 text-sm">
                                    Brak grup pasujących do wyszukiwania.
                                </div>
                            )
                        }
                        return filteredGroups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => onSelect(group.id, group.name)}
                                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-700 text-left group"
                            >
                                <div
                                    className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: group.color + '20', color: group.color }}
                                >
                                    {/* Using Box as fallback icon if actual icon rendering is complex here */}
                                    <Box className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium group-hover:text-white transition-colors">
                                    {group.name}
                                </span>
                            </button>
                        ))
                    })()}
                </div>
            </div>
        </Modal>
    )
}
