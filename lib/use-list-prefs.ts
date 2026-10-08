'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export type ListDetail = 'all' | 'where' | 'names'
export type ListPrefs = { detail: ListDetail; actsCollapsed: boolean; collapseDone: boolean }

const DEFAULTS: ListPrefs = { detail: 'all', actsCollapsed: false, collapseDone: true }
const KEY = 'rk-list-prefs'

const read = (): ListPrefs => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
}
const write = (p: ListPrefs) => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* tryb prywatny */ } }

// Preferencje list rekwizytów to ustawienie osoby, zapisywane na koncie (profiles), żeby telefon i komputer
// działały tak samo (POMYSLY 6). Lokalna kopia daje szybki start i działa dla gości w trybie bez logowania.
export function useListPrefs() {
    const [prefs, setPrefs] = useState<ListPrefs>(DEFAULTS)

    useEffect(() => {
        // Odczyt z urządzenia musi być po zamontowaniu: na serwerze nie ma localStorage (unikamy niezgodności hydracji).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs(read())
        const supabase = createClient()
        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            // Przed migracją kolumn zapytanie zwróci błąd: zostają ustawienia z urządzenia.
            const { data, error } = await supabase.from('profiles').select('list_detail, acts_collapsed, collapse_done').eq('id', user.id).maybeSingle()
            if (error || !data) return
            const next: ListPrefs = {
                detail: (['all', 'where', 'names'] as const).find(d => d === data.list_detail) ?? 'all',
                actsCollapsed: !!data.acts_collapsed,
                collapseDone: data.collapse_done !== false,
            }
            setPrefs(next)
            write(next)
        })()
    }, [])

    const update = useCallback(async (patch: Partial<ListPrefs>) => {
        const next = { ...prefs, ...patch }
        setPrefs(next)
        write(next)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return true
        const { error } = await supabase.from('profiles').update({
            list_detail: next.detail, acts_collapsed: next.actsCollapsed, collapse_done: next.collapseDone,
        }).eq('id', user.id)
        return !error
    }, [prefs])

    return { prefs, update }
}
