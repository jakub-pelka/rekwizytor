'use client'

import { useSearchParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/routing'
import { GroupScannerDialog } from '@/components/groups/GroupScannerDialog'
import { EditGroupDialog } from '@/components/groups/EditGroupDialog'
import { GroupImportDialog } from '@/components/groups/GroupImportDialog'

// Okna magazynu otwierane z innych ekranów: „Skanuj” w dolnym menu (?scan=1), „Dodaj rekwizyt” na pulpicie (?create=1).
// Skaner i formularz grupy przejdą na nowy wygląd w przepływie 4 (karta Skaner).
export function StorageDialogs({ locations = [] }: { locations?: { id: string; name: string }[] }) {
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const close = () => router.replace(params.get('room') ? `${pathname}?room=${params.get('room')}` : pathname)

    return (
        <>
            <GroupScannerDialog isOpen={params.get('scan') === '1'} onClose={close} parentId={null} />
            <EditGroupDialog isOpen={params.get('create') === '1'} onClose={close} group={null} parentId={null} />
            <GroupImportDialog isOpen={params.get('import') === '1'} onClose={close} parentId={null} locations={locations} />
        </>
    )
}
