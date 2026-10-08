import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { GroupStatus } from './performance-structure'

type Client = SupabaseClient<Database>

export type StorageLocation = { id: string; name: string; kind: string; code: string | null; parentId: string | null; sortOrder: number; createdAt: string | null }
export type StorageItem = { id: string; groupId: string | null; locationId: string | null; name: string; code: string | null; status: GroupStatus; statusNote: string | null }
export type StorageGroup = {
    id: string
    name: string
    code: string | null
    description: string | null
    approxCount: number | null
    locationId: string | null
    sortOrder: number
    status: GroupStatus
    statusNote: string | null
    items: StorageItem[]
    /** Spektakle, w których grupa albo jej przedmioty grają (z rozpisek). */
    performances: { id: string; title: string }[]
}

export type StorageData = {
    locations: StorageLocation[]
    groups: StorageGroup[]
    /** Przedmioty bez grupy, leżące wprost w pojemniku (np. kask na półce). */
    looseItems: StorageItem[]
}

export async function loadStorage(supabase: Client): Promise<StorageData> {
    const [locationsResult, groupsResult, itemsResult, usageResult] = await Promise.all([
        supabase.from('locations').select('id, name, kind, code, belongs_to, sort_order, created_at').is('deleted_at', null),
        supabase.from('groups').select('id, name, code, description, approx_count, location_id, sort_order, status, status_note').is('deleted_at', null),
        supabase.from('group_items').select('id, group_id, location_id, name, code, status, status_note, sort_order').is('deleted_at', null).order('sort_order').order('created_at'),
        supabase.from('performance_props').select('group_id, item_id, performance:performances!inner(id, title, deleted_at)')
            .is('performance.deleted_at', null).not('group_id', 'is', null),
    ])

    const items = (itemsResult.data ?? []).map<StorageItem>(i => ({
        id: i.id, groupId: i.group_id, locationId: i.location_id, name: i.name, code: i.code, status: i.status as GroupStatus, statusNote: i.status_note,
    }))

    const usage = new Map<string, Map<string, string>>()
    for (const u of usageResult.data ?? []) {
        if (!u.group_id) continue
        if (!usage.has(u.group_id)) usage.set(u.group_id, new Map())
        usage.get(u.group_id)!.set(u.performance.id, u.performance.title)
    }

    return {
        looseItems: items.filter(i => !i.groupId),
        locations: (locationsResult.data ?? []).map(l => ({
            id: l.id, name: l.name, kind: l.kind, code: l.code, parentId: l.belongs_to, sortOrder: l.sort_order, createdAt: l.created_at,
        })),
        groups: (groupsResult.data ?? []).map(g => ({
            id: g.id,
            name: g.name,
            code: g.code,
            description: g.description,
            approxCount: g.approx_count,
            locationId: g.location_id,
            sortOrder: g.sort_order,
            status: g.status as GroupStatus,
            statusNote: g.status_note,
            items: items.filter(i => i.groupId === g.id),
            performances: [...(usage.get(g.id) ?? new Map()).entries()].map(([id, title]) => ({ id, title })),
        })),
    }
}

const byOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pl')

export const sortLocations = (list: StorageLocation[]) => [...list].sort(byOrder)
export const sortGroups = (list: StorageGroup[]) => [...list].sort(byOrder)

/** Ścieżka miejsca od pomieszczenia: [pomieszczenie, szafa, półka]. */
export function locationPath(locations: StorageLocation[], id: string | null): StorageLocation[] {
    const byId = new Map(locations.map(l => [l.id, l]))
    const path: StorageLocation[] = []
    let current = id ? byId.get(id) : undefined
    while (current && path.length < 6) {
        path.unshift(current)
        current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return path
}

/** Wszystkie miejsca w poddrzewie (razem z tym miejscem). */
export function subtreeIds(locations: StorageLocation[], id: string): Set<string> {
    const ids = new Set([id])
    let grew = true
    while (grew) {
        grew = false
        for (const l of locations) if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) { ids.add(l.id); grew = true }
    }
    return ids
}

/** Najgorszy stan w grupie (grupa ogólna albo jej przedmioty) i ile rzeczy go ma. */
export function groupAlert(g: StorageGroup): { status: Exclude<GroupStatus, 'available'>; count: number } | null {
    const states = [g.status, ...g.items.map(i => i.status)].filter(s => s !== 'available') as Exclude<GroupStatus, 'available'>[]
    if (!states.length) return null
    const worst = states.includes('missing') ? 'missing' : states.includes('loaned') ? 'loaned' : 'in_repair'
    return { status: worst, count: states.filter(s => s === worst).length }
}
