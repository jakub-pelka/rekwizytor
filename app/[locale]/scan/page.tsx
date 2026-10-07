import { createClient } from '@/utils/supabase/server'
import { loadStorage, locationPath, sortLocations } from '@/lib/storage'
import { ScanFlow } from '@/components/scan/ScanFlow'

type Props = { searchParams: Promise<{ in?: string }> }

// Skan zdjęcia (ekran „Skan”, karty Skaner i PhotoAI).
export default async function ScanPage({ searchParams }: Props) {
    const { in: locationId } = await searchParams
    const supabase = await createClient()
    const [{ locations }, { data: { user } }] = await Promise.all([loadStorage(supabase), supabase.auth.getUser()])
    const places = sortLocations(locations).map(l => ({ id: l.id, label: locationPath(locations, l.id).map(p => p.name).join(' › ') }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pl'))
    return <ScanFlow places={places} initialPlace={locationId ?? null} canEdit={!!user} />
}
