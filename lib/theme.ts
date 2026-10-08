// Motyw: Kulisy (ciemny, domyślny) i Biuro (jasny); „jak w systemie” podąża za ustawieniem urządzenia.
// Tokeny obu motywów są w styles/rk/tokens.css ([data-theme="dark"|"light"] na <html>).

export type ThemePreference = 'dark' | 'light' | 'system'
export const THEME_KEY = 'rk-theme'

export function readTheme(): ThemePreference {
    try {
        const v = localStorage.getItem(THEME_KEY)
        return v === 'light' || v === 'system' ? v : 'dark'
    } catch { return 'dark' }
}

export function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
    if (pref === 'system') {
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return pref
}

export function applyTheme(pref: ThemePreference) {
    document.documentElement.dataset.theme = resolveTheme(pref)
}

export function writeTheme(pref: ThemePreference) {
    try { localStorage.setItem(THEME_KEY, pref) } catch { /* tryb prywatny */ }
    applyTheme(pref)
}

/** Ten sam wybór w wersji bez importów, wstawiany inline w <head>, żeby motyw był właściwy od pierwszego renderu. */
export const THEME_INLINE_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');var t=p==='light'?'light':p==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):'dark';document.documentElement.dataset.theme=t;}catch(e){}})();`
