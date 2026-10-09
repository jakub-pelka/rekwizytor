import { createClient } from '@/utils/supabase/server'
import { loadStorage, locationPath, sortLocations, type StorageLocation } from '@/lib/storage'
import { ScanFlow } from '@/components/scan/ScanFlow'
import type { PlaceNode } from '@/components/scan/ScanPlacePicker'

type Props = { searchParams: Promise<{ in?: string }> }

// Drzewo miejsc w kolejności wyświetlania: rodzic, potem jego dzieci (do wyboru miejsca na komputerze).
function placeTree(locations: StorageLocation[]): PlaceNode[] {
    const sorted = sortLocations(locations)
    const ids = new Set(sorted.map(l => l.id))
    const children = new Map<string | null, StorageLocation[]>()
    for (const l of sorted) {
        const parent = l.parentId && ids.has(l.parentId) ? l.parentId : null
        children.set(parent, [...(children.get(parent) ?? []), l])
    }
    const out: PlaceNode[] = []
    const walk = (parent: string | null, depth: number, path: string[]) => {
        for (const l of children.get(parent) ?? []) {
            const here = [...path, l.name]
            out.push({ id: l.id, name: l.name, parentId: parent, depth, path: here, childCount: children.get(l.id)?.length ?? 0 })
            if (depth < 6) walk(l.id, depth + 1, here)
        }
    }
    walk(null, 0, [])
    return out
}

// Skan zdjęcia (ekran „Skan”, karty Skaner i PhotoAI).
export default async function ScanPage({ searchParams }: Props) {
    const { in: locationId } = await searchParams
    const supabase = await createClient()
    const [{ locations }, { data: { user } }] = await Promise.all([loadStorage(supabase), supabase.auth.getUser()])
    const places = sortLocations(locations).map(l => ({ id: l.id, label: locationPath(locations, l.id).map(p => p.name).join(' › ') }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pl'))
    return <ScanFlow places={places} tree={placeTree(locations)} initialPlace={locationId ?? null} canEdit={!!user} />
}
