'use client'

import { useState } from 'react'
import { Plus, QrCode, MoreVertical, FolderPlus, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { GroupScannerDialog } from '@/components/groups/GroupScannerDialog'
import { EditGroupDialog } from '@/components/groups/EditGroupDialog'
import { GroupImportDialog } from '@/components/groups/GroupImportDialog'
import { rasterizeIcon } from '@/utils/icon-rasterizer'
import { notify } from '@/utils/notify'
import { Database } from '@/types/supabase'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon' | 'color'> & {
        locations: { id: string, name: string } | null
    }

interface GroupsHeaderActionsProps {
    readonly groups: Group[]
    readonly currentParentId: string | null
}

export function GroupsHeaderActions({ groups, currentParentId }: GroupsHeaderActionsProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)

    // Extract unique locations for the import dialog
    // We might need to fetch all locations separately if groups list is filtered/paginated, 
    // but for now let's reuse what we have or just pass null if not critical. 
    // Actually, `groups` prop might not contain all locations. 
    // Let's assume for now we just show "Input" column or extract locations from groups if possible.
    // Ideally we should pass available locations prop.
    const locations = Array.from(new Set(
        groups
            .map(g => g.locations)
            .filter((l): l is { id: string, name: string } => !!l) // Filter nulls
            .map(l => JSON.stringify(l)) // Dedupe via string
    )).map(s => JSON.parse(s))


    const handleGenerateAllLabels = async () => {
        const generateLabelsPromise = (async () => {
            // Sort groups by location name, then by group name
            const sortedGroups = [...groups].sort((a, b) => {
                const locA = a.locations?.name || 'Unassigned'
                const locB = b.locations?.name || 'Unassigned'

                if (locA !== locB) {
                    if (locA === 'Unassigned') return 1
                    if (locB === 'Unassigned') return -1
                    return locA.localeCompare(locB)
                }
                return a.name.localeCompare(b.name)
            })

            const allGroups = await Promise.all(sortedGroups.map(async (g) => ({
                id: g.id,
                name: g.name,
                locationName: g.locations?.name,
                iconImage: await rasterizeIcon(g.icon || 'Folder', g.color || '#000000')
            })))

            // Call backend API
            const apiUrl = `${globalThis.location.origin}/api/generate-labels`
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ groups: allGroups })
            })

            if (!response.ok) {
                throw new Error('Failed to generate PDF')
            }

            // Download PDF
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `labels_${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        })()

        setIsGenerating(true)
        notify.promise(generateLabelsPromise, {
            loading: 'Generowanie etykiet...',
            success: 'Etykiety wygenerowane!',
            error: 'Błąd generowania etykiet'
        }, 'pdf').finally(() => setIsGenerating(false))
    }

    return (
        <div className="grid grid-cols-2 w-full md:flex md:w-auto gap-2 md:gap-2 items-center">
            <DropdownAction
                label="Akcje"
                icon={<MoreVertical className="w-4 h-4" />}
                align="left"
                showChevron={false}
                variant="glassy"
                className="w-full justify-center"
            >
                {({ close }) => (
                    <>
                        <a
                            href="/groups/manage"
                            onClick={close}
                            className="block px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors rounded-lg"
                        >
                            Zarządzaj grupami
                        </a>

                        <div className="bg-neutral-800 h-px my-1 mx-2" />

                        <button
                            onClick={(e) => {
                                handleGenerateAllLabels()
                                close()
                            }}
                            disabled={isGenerating}
                            className="group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                            ) : (
                                <QrCode className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-white" />
                            )}
                            <span className="font-medium leading-none">Generuj etykiety</span>
                        </button>
                    </>
                )}
            </DropdownAction>



            <DropdownAction
                label="Dodaj"
                icon={<Plus className="w-4 h-4" />}
                variant="glassy-primary"
                align="right"
                className="w-full justify-center"
            >
                {({ close }) => (
                    <>
                        <button
                            onClick={() => {
                                setIsImportOpen(true)
                                close()
                            }}
                            className="group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors text-neutral-300 hover:text-white hover:bg-neutral-800"
                        >
                            <FolderPlus className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-white" />
                            <span className="font-medium leading-none">Ręcznie</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsScannerOpen(true)
                                close()
                            }}
                            className="group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors text-neutral-300 hover:text-white hover:bg-neutral-800"
                        >
                            <Wand2 className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-white" />
                            <span className="font-medium leading-none">Automatycznie</span>
                        </button>
                    </>
                )}
            </DropdownAction>

            <GroupScannerDialog
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                parentId={currentParentId}
            />

            <EditGroupDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                group={null}
                parentId={currentParentId}
            />

            <GroupImportDialog
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                parentId={currentParentId}
                locations={locations}
            />
        </div>
    )
}
