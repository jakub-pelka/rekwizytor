import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { loadStorage } from '@/lib/storage'
import { StorageView } from '@/components/storage/StorageView'
import { StorageDialogs } from '@/components/storage/StorageDialogs'

type Props = {
    searchParams: Promise<{ room?: string }>
}

// Magazyn (ekrany „Magazyn”, „Magazyn-telefon”, „Magazyn-szukaj”).
export default async function GroupsPage({ searchParams }: Props) {
    const { room } = await searchParams
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)
    const data = await loadStorage(supabase)

    // Jedno pomieszczenie w teatrze: od razu do niego.
    const rooms = data.locations.filter(l => !l.parentId)
    const roomId = room ?? (rooms.length === 1 ? rooms[0].id : null)

    return (
        <>
            <StorageView data={data} roomId={roomId} canEdit={access.canWrite} />
            <StorageDialogs locations={data.locations.map(l => ({ id: l.id, name: l.name }))} />
        </>
    )
}
