import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { loadStorage } from '@/lib/storage'
import { OrganizeBoard } from '@/components/storage/OrganizeBoard'

type Props = { searchParams: Promise<{ room?: string }> }

// Porządkowanie magazynu (ekran „Porzadkowanie”, karta Porzadkowanie).
export default async function OrganizePage({ searchParams }: Props) {
    const { room } = await searchParams
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)
    const data = await loadStorage(supabase)
    const rooms = data.locations.filter(l => !l.parentId)
    const roomId = room ?? (rooms.length === 1 ? rooms[0].id : rooms[0]?.id ?? null)
    return <OrganizeBoard data={data} roomId={roomId} canEdit={access.canWrite} />
}
