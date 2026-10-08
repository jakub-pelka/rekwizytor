import { RK_AVATAR_PALETTES } from '@/components/rk/avatar-data'

// Pomieszczenia w magazynie rozpoznajemy po ikonie i kolorze kafelka, nadawanych automatycznie (karta Magazyn):
// ikona wynika z nazwy, kolor z kolejności założenia. Nikt tego nie wybiera, a lista nie jest ścianą identycznych kafelków.

export type RoomIconName =
    | 'Hammer' | 'Drama' | 'Crown' | 'House' | 'DoorOpen' | 'Armchair' | 'Shirt' | 'KeyRound' | 'Warehouse' | 'Archive' | 'Box'

// Wygrywa dopasowanie najwcześniejsze w nazwie (w polskiej nazwie rzecz główna stoi na początku: „Szafa na korytarzu”
// to szafa, „Magazynek przy scenie” to magazyn); przy remisie decyduje kolejność reguł. Wzorce to rdzenie słów.
const ICON_RULES: [RegExp, RoomIconName][] = [
    [/rekwizytorn/, 'Crown'],
    [/pracown|warsztat/, 'Hammer'],
    [/garderob|kostium|krawiec|szatni/, 'Shirt'],
    [/scen|kulis|zaplecz|backstage/, 'Drama'],
    [/strych|poddasz/, 'House'],
    [/korytarz|hol\b|przedsion|przejści/, 'DoorOpen'],
    [/\bsala|\bsali|salk|foyer|foje/, 'Armchair'],
    [/schowek|schowk|komórk|klucz/, 'KeyRound'],
    [/magazyn|skład|hala|hali/, 'Warehouse'],
    [/szaf|regał|półk|piwnic|suteren|archiw/, 'Archive'],
]

/** Ikona pomieszczenia z jego nazwy; gdy nic nie pasuje, domyślne pudełko. */
export function roomIconName(name: string): RoomIconName {
    const n = name.toLocaleLowerCase('pl')
    let best: { at: number; icon: RoomIconName } | null = null
    for (const [re, icon] of ICON_RULES) {
        const at = n.search(re)
        if (at >= 0 && (!best || at < best.at)) best = { at, icon }
    }
    return best?.icon ?? 'Box'
}

// Bez bordo (kolor marki, mógłby wyglądać jak alarm): reszta palety awatarów z design systemu, przygaszone barwy,
// które nigdy nie są kolorami statusów.
const TILE_COLORS = RK_AVATAR_PALETTES.bg.slice(1)

/**
 * Kolor kafelka z kolejności założenia pomieszczenia: pierwsze dostaje pierwszy kolor itd.
 * Kolejność wg daty założenia jest stała, więc nowe pomieszczenie nie przemalowuje starych,
 * a sąsiednie na liście różnią się kolorem, dopóki jest ich nie więcej niż barw.
 */
export function roomColors(rooms: { id: string; createdAt: string | null }[]): Map<string, string> {
    const ordered = [...rooms].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))
    return new Map(ordered.map((r, i) => [r.id, TILE_COLORS[i % TILE_COLORS.length]]))
}
