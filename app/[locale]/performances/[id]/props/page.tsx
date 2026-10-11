import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { BreakdownEditor, type StorageSuggestion } from '@/components/performances/BreakdownEditor'
import { loadPerformanceStructure } from '@/lib/performance-structure'

type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<{ new?: string }>
}

export default async function ManagePropsPage({ params, searchParams }: Props) {
    const { id } = await params
    const { new: isNew } = await searchParams
    const supabase = await createClient()

    const { data: production } = await supabase
        .from('performances')
        .select('title')
        .eq('id', id)
        .single()

    if (!production) {
        notFound()
    }

    const [structure, groupsResult, itemsResult] = await Promise.all([
        loadPerformanceStructure(supabase, id),
        supabase.from('groups').select('id, name, description, locations(name)').is('deleted_at', null).order('name'),
        supabase.from('group_items').select('id, name, description, group_id').is('deleted_at', null).not('group_id', 'is', null).order('name'),
    ])
    const groupRows = groupsResult.data ?? []
    const groups = groupRows.map(g => ({
        id: g.id,
        label: [g.locations?.name, g.name].filter(Boolean).join(' › '),
    }))

    // Podpowiedzi z magazynu: grupy (ścieżka: miejsce) i rozpisane przedmioty (ścieżka: miejsce › grupa).
    const groupById = new Map(groupRows.map(g => [g.id, g]))
    const storage: StorageSuggestion[] = [
        ...groupRows.map(g => ({ id: `g:${g.id}`, name: g.name, path: g.locations?.name ?? null, description: g.description, groupId: g.id, itemId: null })),
        ...(itemsResult.data ?? []).flatMap(i => {
            const g = i.group_id ? groupById.get(i.group_id) : undefined
            if (!g) return []
            return [{ id: `i:${i.id}`, name: i.name, path: [g.locations?.name, g.name].filter(Boolean).join(' › '), groupId: g.id, description: i.description, itemId: i.id }]
        }),
    ]

    return (
        <BreakdownEditor
            performanceId={id}
            performanceTitle={production.title}
            structure={structure}
            groups={groups}
            storage={storage}
            isNew={isNew === '1'}
        />
    )
}
