// Formaty z design systemu: daty na kafelkach i w górnym wierszu, odmiana liczności (karta Licznik),
// numeracja scen „I.3” i nazwy obsad.

const WEEKDAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
const WEEKDAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** „Nd” */
export const weekdayShort = (d: Date) => WEEKDAYS_SHORT[d.getDay()]

/** „4.10” */
export const dayMonth = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`

/** „19:00” */
export const time = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

/**
 * Terminy (show_date) są w bazie czasem lokalnym teatru bez strefy, np. „2026-10-04T19:00:00”.
 * Żeby porównania działały tak samo na serwerze (UTC) i w przeglądarce, „teraz” liczymy
 * w tym samym układzie: czas warszawski zapisany bez strefy.
 */
export function theatreNowNaive(): string {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23',
    }).format(new Date())
    return parts.replace(' ', 'T')
}

/** Chwila z bazy (timestamptz, np. done_at) jako Date w układzie czasu teatru. */
export function theatreDate(iso: string): Date {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(iso))
    return new Date(parts.replace(' ', 'T'))
}

/** „11:05” dziś, „wczoraj, 22:30”, wcześniej „2.10, 18:00”. */
export function whenShort(d: Date, now: Date) {
    const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
    if (days === 0) return time(d)
    if (days === 1) return `wczoraj, ${time(d)}`
    return `${dayMonth(d)}, ${time(d)}`
}

/** Pełna data w nadtytule pulpitu: „Niedziela, 4 października”. */
export function longDate(d: Date) {
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

/** Czas teatru bez strefy („2026-10-07T19:00:00”) jako chwila w ms (uwzględnia czas letni). */
export function theatreNaiveToInstant(naive: string): number {
    const guess = Date.parse(`${naive}Z`)
    const wall = Date.parse(`${new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(guess)).replace(' ', 'T')}Z`)
    return guess - (wall - guess)
}

/** „Teraz” jako Date w tym samym układzie co new Date(show_date). */
export const theatreNow = () => new Date(theatreNowNaive())

/** Sezon teatralny trwa od września do sierpnia: „Sezon 2026/27”. */
export function seasonOf(d: Date) {
    const start = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1
    return { start, label: `Sezon ${start}/${String(start + 1).slice(2)}` }
}

const startOfDay =(d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Dzień względem dziś: „Dziś”, „Jutro”, „Wtorek” (w tym tygodniu) albo „14.11”. */
export function relativeDay(d: Date, now = new Date()) {
    const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000)
    if (diff === 0) return 'Dziś'
    if (diff === 1) return 'Jutro'
    if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()]
    return dayMonth(d)
}

export const isSameDay = (a: Date, b: Date) => startOfDay(a) === startOfDay(b)

/**
 * Polska odmiana liczności: plural(5, ['spektakl', 'spektakle', 'spektakli']) → „5 spektakli”.
 * 1 → forma pierwsza, 2–4 (poza 12–14) → druga, reszta → trzecia.
 */
export function plural(n: number, [one, few, many]: [string, string, string]) {
    const mod10 = n % 10
    const mod100 = n % 100
    const form = n === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
    return `${n} ${form}`
}

export const roman = (n: number) => ROMAN[n] ?? String(n)

/** Numer sceny „I.3”; sam akt „II”; scena przygotowania (akt 0) „PRZ”. */
export function sceneCode(act: number | null | undefined, scene?: number | null) {
    if (act === 0) return 'PRZ'
    if (act == null) return scene != null ? String(scene) : ''
    return scene != null ? `${roman(act)}.${scene}` : roman(act)
}

/** Kody obsad w bazie ('first', 'second', 'other') i ich nazwy w interfejsie. */
export const CAST_LABEL: Record<string, string> = { first: 'A', second: 'B', other: 'inna' }
export const castLabel = (cast: string | null | undefined) => (cast ? CAST_LABEL[cast] ?? cast : null)

/** „4 h 20 min”, „35 min” */
export function duration(ms: number) {
    const totalMin = Math.max(0, Math.round(ms / 60_000))
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h === 0) return `${m} min`
    return m === 0 ? `${h} h` : `${h} h ${m} min`
}
