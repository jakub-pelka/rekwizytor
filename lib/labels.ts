// Dane i adresy etykiet bez Reacta, żeby korzystały z nich zarówno strona serwerowa (/labels), jak i komponenty klienckie.

export type LabelFormat = 'item' | 'mini' | 'flag' | 'group' | 'place'

export interface PrintableLabelItem {
    id: string
    name: string
    code: string
    kind: 'group' | 'item' | 'place'
    shortId?: string | null
    subName?: string | null
    whereName?: string | null
    qrSvg?: string
}


export function getLabelQrUrl(item: PrintableLabelItem, origin: string): string {
    const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
    // Starsze naklejki grup prowadzą przez /g/<short_id>; bez short_id używamy numeru GRP-.
    if (item.kind === 'group' && item.shortId) {
        return `${base}/g/${item.shortId}`
    }
    return `${base}/scan/resolve?code=${encodeURIComponent(item.code)}`
}

