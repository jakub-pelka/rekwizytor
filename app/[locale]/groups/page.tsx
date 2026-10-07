import { createClient } from '@/utils/supabase/server'
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
    const [data, { data: { user } }] = await Promise.all([loadStorage(supabase), supabase.auth.getUser()])

    // Jedno pomieszczenie w teatrze: od razu do niego.
    const rooms = data.locations.filter(l => !l.parentId)
    const roomId = room ?? (rooms.length === 1 ? rooms[0].id : null)

    return (
        <>
            <StorageView data={data} roomId={roomId} canEdit={!!user} />
            <StorageDialogs locations={data.locations.map(l => ({ id: l.id, name: l.name }))} />
        </>
    )
}
