import { createClient } from '@/utils/supabase/server'
import { loadStorage } from '@/lib/storage'
import { OrganizeBoard } from '@/components/storage/OrganizeBoard'

type Props = { searchParams: Promise<{ room?: string }> }

// Porządkowanie magazynu (ekran „Porzadkowanie”, karta Porzadkowanie).
export default async function OrganizePage({ searchParams }: Props) {
    const { room } = await searchParams
    const supabase = await createClient()
    const [data, { data: { user } }] = await Promise.all([loadStorage(supabase), supabase.auth.getUser()])
    const rooms = data.locations.filter(l => !l.parentId)
    const roomId = room ?? (rooms.length === 1 ? rooms[0].id : rooms[0]?.id ?? null)
    return <OrganizeBoard data={data} roomId={roomId} canEdit={!!user} />
}
