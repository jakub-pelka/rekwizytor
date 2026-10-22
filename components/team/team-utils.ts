// Pomocnicze funkcje ekranu zespołu: inicjały, kolor kafelka, „ostatnio” i „wysłano”.

// Kolory kafelków inicjałów (--ini w planszach „Zespół”).
const INI_COLORS = ['#6E1720', '#2B3A5A', '#1F4D3A', '#5A3F2A', '#5A2A55', '#3A3A3A']

export function initialsColor(seed: string) {
    let h = 0
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return INI_COLORS[h % INI_COLORS.length]
}

/** „Anna Kowalska” → „AK”; bez imienia pierwsza litera adresu. */
export function initialsOf(name: string | null, email: string) {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return (email[0] ?? '?').toUpperCase()
}

/** Pełne dni kalendarzowe od chwili iso do teraz (0 = dziś, 1 = wczoraj). */
export function daysAgo(iso: string, now = new Date()) {
    const d = new Date(iso)
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.max(0, Math.round((a - b) / 86_400_000))
}

/** „16.10 · 10:12” */
export function eventStamp(iso: string) {
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getDate()}.${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** „26.10” */
export function dateShort(iso: string) {
    const d = new Date(iso)
    return `${d.getDate()}.${pad2(d.getMonth() + 1)}`
}

/** „26.10.2026” */
export function dateLong(iso: string) {
    return `${dateShort(iso)}.${new Date(iso).getFullYear()}`
}

/** „18:40” */
export function timeOf(iso: string) {
    const d = new Date(iso)
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Kod w formie do wklejenia w SMS: same cyfry, „482 913” → „482913”. */
export function rawCode(code: string) {
    return code.replace(/\D/g, '')
}
