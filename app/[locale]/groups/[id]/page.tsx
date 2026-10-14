import { notFound } from 'next/navigation'
import { getAccess } from '@/lib/access'
import { createClient } from '@/utils/supabase/server'
import { loadStorage, locationPath } from '@/lib/storage'
import { loadPerformanceStructure } from '@/lib/performance-structure'
import { GroupCard, type GroupUsage } from '@/components/storage/GroupCard'

type Props = { readonly params: Promise<{ readonly id: string }> }

// Karta grupy przedmiotów („Karta-telefon”).
export default async function GroupCardPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)
    const [data, usageResult] = await Promise.all([
        loadStorage(supabase),
        supabase.from('performance_props')
            .select('id, item_name, item_id, performance_id, performance:performances!inner(id, title, deleted_at)')
            .eq('group_id', id)
            .is('performance.deleted_at', null),
    ])

    const group = data.groups.find(g => g.id === id)
    if (!group) notFound()

    // Numer sceny przy każdym użyciu w rozpisce („I.3 · Wesele · Kielich srebrny”).
    const rows = usageResult.data ?? []
    const structures = new Map(await Promise.all(
        [...new Set(rows.map(r => r.performance_id))].map(async pid => [pid, await loadPerformanceStructure(supabase, pid)] as const)
    ))
    const usage: GroupUsage[] = rows.map(r => ({
        propId: r.id,
        performanceId: r.performance_id,
        title: r.performance.title,
        name: r.item_name,
        code: structures.get(r.performance_id)?.props.find(p => p.id === r.id)?.code ?? '',
        itemId: r.item_id,
    }))

    const path = locationPath(data.locations, group.locationId)
    return <GroupCard group={group} path={path} usage={usage} canEdit={access.canWrite} />
}
