import React from 'react'
import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { createClient } from '@/utils/supabase/server'
import { LabelSheet } from '@/components/labels/LabelSheet'
import { type PrintableLabelItem, getLabelQrUrl } from '@/lib/labels'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseValidUuids(raw?: string | string[]): string[] {
    if (!raw) return []
    const str = Array.isArray(raw) ? raw.join(',') : raw
    return str
        .split(',')
        .map(id => id.trim())
        .filter(id => UUID_REGEX.test(id))
}

type Props = {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ kind?: string; ids?: string | string[] }>
}

export default async function LabelsPage({ searchParams }: Props) {
    const { kind: rawKind, ids: rawIds } = await searchParams

    const kind: 'group' | 'item' | 'place' =
        rawKind === 'item' || rawKind === 'place' || rawKind === 'group'
            ? rawKind
            : 'group'

    const hasIdsParam = rawIds !== undefined && rawIds !== null && rawIds !== ''
    const validUuids = parseValidUuids(rawIds)

    const supabase = await createClient()

    // Resolve current site origin for QR code generation
    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000'
    const proto = headerList.get('x-forwarded-proto') || 'http'
    const origin = `${proto}://${host}`

    let rawRecords: Array<{
        id: string
        name: string
        code: string | null
        short_id?: string | null
        belongs_to?: string | null
        parent?: { id: string; name: string } | null
    }> = []

    if (hasIdsParam && validUuids.length === 0) {
        // If IDs were provided but none were valid UUIDs, leave rawRecords empty
        rawRecords = []
    } else if (kind === 'group') {
        let query = supabase
            .from('groups')
            .select('id, name, code, short_id')
            .is('deleted_at', null)
            .order('name')

        if (validUuids.length > 0) {
            query = query.in('id', validUuids)
        }

        const { data } = await query
        rawRecords = (data ?? []).map(g => ({
            id: g.id,
            name: g.name,
            code: g.code,
            short_id: g.short_id,
        }))
    } else if (kind === 'item') {
        let query = supabase
            .from('group_items')
            .select('id, name, code')
            .is('deleted_at', null)
            .order('name')

        if (validUuids.length > 0) {
            query = query.in('id', validUuids)
        }

        const { data } = await query
        rawRecords = (data ?? []).map(i => ({
            id: i.id,
            name: i.name,
            code: i.code,
        }))
    } else if (kind === 'place') {
        let query = supabase
            .from('locations')
            .select('id, name, code, belongs_to, parent:locations!belongs_to(id, name)')
            .is('deleted_at', null)
            .order('name')

        if (validUuids.length > 0) {
            query = query.in('id', validUuids)
        }

        const { data } = await query
        rawRecords = (data ?? []).map(l => ({
            id: l.id,
            name: l.name,
            code: l.code,
            belongs_to: l.belongs_to,
            parent: l.parent as { id: string; name: string } | null,
        }))
    }

    // Split records into printable items (with code) and skipped ones (missing code)
    const printableRaw = rawRecords.filter(r => r.code && r.code.trim().length > 0)
    const missingCode = rawRecords.filter(r => !r.code || r.code.trim().length === 0)

    // Pre-generate QR codes on the server for instant crisp rendering
    const printableItems: PrintableLabelItem[] = await Promise.all(
        printableRaw.map(async r => {
            const item: PrintableLabelItem = {
                id: r.id,
                name: r.name,
                code: r.code!,
                kind,
                shortId: r.short_id ?? null,
                whereName: kind === 'place' ? (r.parent?.name || r.name) : undefined,
                subName: kind === 'place' && r.parent ? r.name : undefined,
            }

            const qrUrl = getLabelQrUrl(item, origin)
            try {
                item.qrSvg = await QRCode.toString(qrUrl, { type: 'svg', margin: 2 })
            } catch (err) {
                console.error(`Failed to pre-generate QR for ${r.id}:`, err)
            }

            return item
        })
    )

    return (
        <LabelSheet
            items={printableItems}
            missingCount={missingCode.length}
            missingNames={missingCode.map(m => m.name)}
            initialKind={kind}
            origin={origin}
        />
    )
}
