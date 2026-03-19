'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { GroupCard } from '@/components/groups/GroupCard'
import { Button } from '@/components/ui/Button'
import { Plus, Link2 } from 'lucide-react'
import { notify } from '@/utils/notify'
import { GroupDetailsDialog } from '@/components/groups/GroupDetailsDialog'
import { EditGroupDialog } from '@/components/groups/EditGroupDialog'
import { Database } from '@/types/supabase'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

type Group = Database['public']['Tables']['groups']['Row'] & {
    locations: { name: string } | null
}

interface Props {
    readonly performanceId: string
    readonly performanceTitle: string
    readonly groups: Group[]
    readonly performanceColor?: string | null
}

export function PerformanceGroups({ performanceId, performanceTitle, groups, performanceColor }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [editingGroup, setEditingGroup] = useState<Group | null>(null)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [availableGroups, setAvailableGroups] = useState<{ id: string, name: string }[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState('')

    const handleAddGroup = async () => {
        setIsLoading(true)
        try {
            // Calculate next number
            const regex = new RegExp(`^${performanceTitle} #(\\d+)$`)
            let maxNum = 0
            let hasBaseGroup = false

            // Check existing groups
            groups.forEach(g => {
                if (g.name === performanceTitle) {
                    hasBaseGroup = true
                }

                const match = regex.exec(g.name)
                if (match) {
                    const num = Number.parseInt(match[1])
                    if (num > maxNum) maxNum = num
                }
            })

            // Logic:
            // 1. If "Performance" doesn't exist -> create "Performance"
            // 2. If "Performance" exists -> create "Performance #2"
            // 3. If "Performance #2" exists -> create "Performance #3"

            let newName = performanceTitle

            if (hasBaseGroup) {
                const nextNum = maxNum < 2 ? 2 : maxNum + 1
                newName = `${performanceTitle} #${nextNum}`
            }

            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name: newName,
                    performance_id: performanceId,
                    icon: 'Box'
                })
                .select('id')
                .single()

            if (error) throw error

            // Generate embedding in background
            if (data) {
                import('@/app/actions/generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                    generateGroupEmbedding(data.id).catch(err =>
                        console.error('Failed to generate embedding:', err)
                    )
                })
            }

            notify.success(`Utworzono grupę: ${newName}`)
            router.refresh()
        } catch (error) {
            console.error(error)
            notify.error('Nie udało się utworzyć grupy')
        } finally {
            setIsLoading(false)
        }
    }

    const openLinkModal = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('groups')
                .select('id, name')
                .is('performance_id', null)
                .order('name')

            if (error) throw error
            setAvailableGroups(data || [])
            setIsLinkModalOpen(true)
        } catch (error) {
            console.error(error)
            notify.error('Nie udało się pobrać dostępnych grup')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLinkGroup = async () => {
        if (!selectedGroupId) return
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('groups')
                .update({ performance_id: performanceId })
                .eq('id', selectedGroupId)

            if (error) throw error

            notify.success('Grupa została przypisana')
            setIsLinkModalOpen(false)
            setSelectedGroupId('')
            router.refresh()
        } catch (error) {
            console.error(error)
            notify.error('Nie udało się przypisać grupy')
        } finally {
            setIsLoading(false)
        }
    }

    const handleEdit = (group: Group) => {
        setIsDetailsOpen(false)
        setEditingGroup(group)
    }

    const handleDelete = async (group: Group) => {
        if (!confirm(`Czy na pewno usunąć grupę "${group.name}"?`)) return

        try {
            const { error } = await supabase.from('groups').delete().eq('id', group.id)
            if (error) throw error

            notify.success('Grupa usunięta')
            setIsDetailsOpen(false)
            setSelectedGroup(null)
            router.refresh()
        } catch (error) {
            console.error('Delete error:', error)
            notify.error('Nie udało się usunąć grupy')
        }
    }

    const openGroupDetails = (group: Group) => {
        setSelectedGroup(group)
        setIsDetailsOpen(true)
    }

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
                <h3 className="font-bold text-neutral-200 flex items-center gap-2 font-sans text-base">
                    {/* <Box className="w-4 h-4 text-neutral-400" /> */}
                    Grupy
                </h3>
                <DropdownAction
                    label="Dodaj grupę"
                    variant="secondary"
                    className="h-7 text-xs px-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:text-white"
                    icon={<Plus className="w-3 h-3" />}
                    items={[
                        {
                            label: 'Utwórz nową grupę',
                            icon: <Plus className="w-4 h-4" />,
                            onClick: () => void handleAddGroup(),
                            isLoading: isLoading && !isLinkModalOpen
                        },
                        {
                            label: 'Dodaj istniejącą grupę',
                            icon: <Link2 className="w-4 h-4" />,
                            onClick: () => void openLinkModal(),
                            isLoading: isLoading && isLinkModalOpen
                        }
                    ]}
                />
            </div>

            <div className="p-4">
                <div className="flex flex-wrap gap-2 items-stretch">
                    {groups.map(group => {
                        const totalLength = (group.name?.length || 0) + (group.locations?.name?.length || 0)
                        const isLong = totalLength > 20

                        return (
                            <div
                                key={group.id}
                                className={`min-w-0 max-w-full transition-all duration-200 ${isLong
                                    ? 'basis-full grow'
                                    : 'basis-full sm:basis-auto grow sm:grow-0 sm:min-w-[170px]'
                                    }`}
                            >
                                <GroupCard
                                    group={group}
                                    showLocationAsPrimary={true}
                                    onClick={() => openGroupDetails(group)}
                                    colorOverride={performanceColor || undefined}
                                    variant="compact"
                                />
                            </div>
                        )
                    })}

                    {groups.length === 0 && (
                        <div className="col-span-full py-8 text-center border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-sm w-full">
                            Brak grup przypisanych do tego spektaklu.
                        </div>
                    )}
                </div>
            </div>

            <GroupDetailsDialog
                group={selectedGroup}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EditGroupDialog
                group={editingGroup}
                isOpen={!!editingGroup}
                onClose={() => setEditingGroup(null)}
            />

            <Modal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                title="Dodaj istniejącą grupę"
                description="Wybierz grupę z magazynu, aby przypisać ją do tego spektaklu."
            >
                <div className="space-y-6 pt-2">
                    <SearchableSelect
                        label="Wybierz grupę"
                        options={availableGroups}
                        value={selectedGroupId}
                        onChange={setSelectedGroupId}
                        placeholder="Szukaj grupy..."
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <Button
                            variant="ghost"
                            onClick={() => setIsLinkModalOpen(false)}
                        >
                            Anuluj
                        </Button>
                        <Button
                            onClick={handleLinkGroup}
                            isLoading={isLoading}
                            disabled={!selectedGroupId}
                            variant="primary"
                        >
                            Dodaj do spektaklu
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
