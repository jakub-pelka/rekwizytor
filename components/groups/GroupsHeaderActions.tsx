'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, QrCode, MoreVertical, FolderPlus, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { GroupScannerDialog } from '@/components/groups/GroupScannerDialog'
import { EditGroupDialog } from '@/components/groups/EditGroupDialog'
import { GroupImportDialog } from '@/components/groups/GroupImportDialog'
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
    // „Skanuj” w dolnym menu prowadzi tu z ?scan=1 i od razu otwiera skaner.
    const [isScannerOpen, setIsScannerOpen] = useState(useSearchParams().get('scan') === '1')
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


    const handleGenerateAllLabels = () => {
        const ids = groups.map(g => g.id).filter(Boolean).join(',')
        if (!ids) {
            notify.error('Brak grup do wydruku')
            return
        }
        window.open(`/labels?kind=group&ids=${ids}`, '_blank')
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
                            onClick={() => {
                                handleGenerateAllLabels()
                                close()
                            }}
                            className="group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors text-neutral-300 hover:text-white hover:bg-neutral-800"
                        >
                            <QrCode className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-white" />
                            <span className="font-medium leading-none">Drukuj etykiety</span>
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
