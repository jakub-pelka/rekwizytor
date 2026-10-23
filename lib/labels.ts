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
    // Każda etykieta prowadzi przez numer (GRP-, REK-, MSC-) do nowego ekranu Magazynu. Dawne naklejki grup z /g/<short_id>
    // nadal działają (trasa /g i resolveCode zostają), ale nowych nie drukujemy w starym formacie.
    return `${base}/scan/resolve?code=${encodeURIComponent(item.code)}`
}

