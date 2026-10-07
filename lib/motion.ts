/**
 * Moduł wyboru i obsługi poziomu ruchu (Premiera / Próba czytana)
 * Zgodny z docs/redesign/design-system/01-ruch.md
 */

export type MotionLevel = 'full' | 'lite'
export type MotionPreference = 'auto' | 'full' | 'lite'

export const MOTION_STORAGE_KEY = 'rk_motion_pref'
export const MOTION_AUTO_STORAGE_KEY = 'rk_motion_auto'

/**
 * Wykrywa rekomendowany poziom ruchu na podstawie możliwości sprzętu i przeglądarki.
 * W razie jakichkolwiek wątpliwości lub błędów zwraca 'lite' (Próba czytana).
 */
export function detectMotionLevel(): MotionLevel {
    try {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return 'lite'
        }

        // 1. prefers-reduced-motion w systemie (dostępność) -> zawsze 'lite'
        if (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return 'lite'
        }

        // 2. Wcześniej zapisany wynik automatycznego monitorowania klatek
        const autoSaved = readAutoLevel()
        if (autoSaved === 'lite') {
            return 'lite'
        }

        // 3. navigator.hardwareConcurrency <= 2 (2 lub mniej rdzeni)
        if (
            typeof navigator !== 'undefined' &&
            typeof navigator.hardwareConcurrency === 'number' &&
            navigator.hardwareConcurrency <= 2
        ) {
            return 'lite'
        }

        // 4. navigator.deviceMemory <= 2 (2 GB lub mniej, tam gdzie zgłaszane)
        const nav = typeof navigator !== 'undefined'
            ? (navigator as Navigator & {
                deviceMemory?: number
                connection?: { saveData?: boolean }
            })
            : undefined

        if (nav && typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
            return 'lite'
        }

        // 5. navigator.connection.saveData (włączony tryb oszczędzania danych)
        if (nav?.connection && Boolean(nav.connection.saveData)) {
            return 'lite'
        }

        // 6. Brak obsługi clip-path (kluczowe dla kurtyny w trybie pełnym)
        if (
            typeof CSS === 'undefined' ||
            typeof CSS.supports !== 'function' ||
            !CSS.supports('clip-path', 'inset(0 0 100% 0)')
        ) {
            return 'lite'
        }

        return 'full'
    } catch {
        // W razie wątpliwości lub błędu wybieramy Próbę czytaną
        return 'lite'
    }
}

/**
 * Odczytuje preferencję użytkownika z localStorage ('auto' | 'full' | 'lite').
 * Bezpieczne dla trybu prywatnego i SSR.
 */
export function readPreference(): MotionPreference {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return 'auto'
        }
        const val = window.localStorage.getItem(MOTION_STORAGE_KEY)
        if (val === 'full' || val === 'lite' || val === 'auto') {
            return val
        }
    } catch {
        // localStorage niedostępny
    }
    return 'auto'
}

/**
 * Zapisuje preferencję użytkownika w localStorage.
 */
export function writePreference(preference: MotionPreference): void {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(MOTION_STORAGE_KEY, preference)
        }
    } catch {
        // localStorage niedostępny
    }
}

/**
 * Odczytuje automatycznie ustalony wynik (np. po wykryciu spadku klatek) z localStorage.
 */
export function readAutoLevel(): MotionLevel | null {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null
        }
        const val = window.localStorage.getItem(MOTION_AUTO_STORAGE_KEY)
        if (val === 'full' || val === 'lite') {
            return val
        }
    } catch {
        // localStorage niedostępny
    }
    return null
}

/**
 * Zapisuje lub czyści automatycznie ustalony wynik w localStorage.
 */
export function writeAutoLevel(level: MotionLevel | null): void {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            if (level) {
                window.localStorage.setItem(MOTION_AUTO_STORAGE_KEY, level)
            } else {
                window.localStorage.removeItem(MOTION_AUTO_STORAGE_KEY)
            }
        }
    } catch {
        // localStorage niedostępny
    }
}

/**
 * Ustawia atrybut data-motion na elemencie <html> (document.documentElement.dataset.motion).
 */
export function applyMotion(level: MotionLevel): void {
    try {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.dataset.motion = level
        }
    } catch {
        // ignoruj błędy DOM
    }
}

/**
 * Ustala aktywny poziom ruchu na podstawie preferencji (preferencja ma pierwszeństwo, 'auto' używa detectMotionLevel).
 */
export function resolveMotionLevel(preference: MotionPreference = readPreference()): MotionLevel {
    if (preference === 'full') return 'full'
    if (preference === 'lite') return 'lite'
    return detectMotionLevel()
}
