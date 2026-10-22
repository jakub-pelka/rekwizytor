'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { LIVE_WINDOW } from '@/lib/performance-structure'
import { theatreDate, time } from '@/lib/rk-format'

const storageKey = (listId: string) => `rk-pending-start:${listId}`

// Czekający start trzyma chwilę kliknięcia (nie chwilę wysyłki). Starszy niż okno trybu na żywo jest już bez sensu,
// więc po powrocie sieci po godzinach nie włączy trybu „za wcześnie” ani „za późno”.
function readPending(listId: string): string | null {
    try {
        const at = localStorage.getItem(storageKey(listId))
        if (!at) return null
        if (Date.now() - new Date(at).getTime() > LIVE_WINDOW) { localStorage.removeItem(storageKey(listId)); return null }
        return at
    } catch { return null }
}
function writePending(listId: string, at: string | null) {
    try {
        if (at) localStorage.setItem(storageKey(listId), at)
        else localStorage.removeItem(storageKey(listId))
    } catch { /* tryb prywatny: start czeka tylko w pamięci strony */ }
}

const isNetworkError = (e: { message?: string } | null) =>
    !navigator.onLine || (!!e?.message && /fetch|network|load failed/i.test(e.message))

// Cichy przycisk „Zaczynamy” (POMYSLY 7): zapisuje ręczny start w show_lists.live_act_started_at.
// Gdy sieci nie ma, start czeka na urządzeniu z chwilą kliknięcia i zapisuje się po powrocie połączenia.
// Zapis nie nadpisuje startu, który ktoś inny już zapisał (is null).
// Hook trzymamy w jednym miejscu ekranu (przycisk bywa wyrenderowany osobno na telefonie i komputerze).
// Po zapisie pokazuje „Start zapisany” z „Cofnij”.
export function useLiveStart(listId: string, onStarted: (startedAt: string) => void, onUndone: () => void) {
    const t = useTranslations('LiveStart')
    const [pending, setPending] = useState<string | null>(null)
    const [starting, setStarting] = useState(false)
    const onStartedRef = useRef(onStarted)
    const onUndoneRef = useRef(onUndone)
    const undoRef = useRef<(at: string) => Promise<boolean>>(async () => false)
    const pendingRef = useRef<string | null>(null)
    useEffect(() => { onStartedRef.current = onStarted; onUndoneRef.current = onUndone })

    // „Cofnij” tylko, gdy to nasz zapis. Gdy ktoś zdążył wcześniej (0 zmienionych wierszy), jego start zostaje i nie dajemy go cofnąć.
    const announce = useCallback((at: string, saved: boolean) => {
        if (saved) {
            notify.undo(t('started', { time: time(theatreDate(at)) }), t('undo'), async () => {
                if (await undoRef.current(at)) { notify.success(t('undone')); onUndoneRef.current() }
            })
        }
        onStartedRef.current(at)
    }, [t])

    const write = useCallback(async (at: string) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        return supabase.from('show_lists')
            .update({ live_act_started_at: at, live_updated_by: user?.id ?? null })
            .eq('id', listId)
            .is('live_act_started_at', null)
            .select('id')
    }, [listId])

    const flush = useCallback(async () => {
        const at = pendingRef.current ?? readPending(listId)
        if (!at || !navigator.onLine) return
        const { data, error } = await write(at)
        if (error) {
            if (!isNetworkError(error)) { writePending(listId, null); pendingRef.current = null; setPending(null); notify.error(t('failed')) }
            return
        }
        writePending(listId, null)
        pendingRef.current = null
        setPending(null)
        announce(at, (data?.length ?? 0) > 0)
    }, [listId, write, t, announce])

    useEffect(() => {
        pendingRef.current = readPending(listId)
        setPending(pendingRef.current)
        void flush()
        const onOnline = () => { void flush() }
        window.addEventListener('online', onOnline)
        return () => window.removeEventListener('online', onOnline)
    }, [listId, flush])

    const queue = useCallback((at: string) => { writePending(listId, at); pendingRef.current = at; setPending(at) }, [listId])

    // Gdy start już czeka na sieć, kliknięcie ponawia wysyłkę (z chwilą pierwszego kliknięcia), a nie zakłada nowego startu.
    const start = useCallback(async () => {
        if (pendingRef.current) { await flush(); return }
        const at = new Date().toISOString()
        setStarting(true)
        try {
            if (!navigator.onLine) { queue(at); return }
            const { data, error } = await write(at)
            if (!error) { announce(at, (data?.length ?? 0) > 0); return }
            if (isNetworkError(error)) { queue(at); return }
            notify.error(t('failed'))
        } catch {
            // fetch rzucił wyjątek (np. utrata połączenia w trakcie): traktujemy jak brak sieci
            queue(at)
        } finally {
            setStarting(false)
        }
    }, [write, t, announce, queue, flush])

    // Cofnięcie: przywraca brak ręcznego startu (tryb wraca do godziny z kalendarza).
    // Czyści tylko wartość, którą sami zapisaliśmy.
    const undo = useCallback(async (at: string) => {
        const { error } = await createClient().from('show_lists').update({ live_act_started_at: null }).eq('id', listId).eq('live_act_started_at', at)
        if (error) { notify.error(t('undoFailed')); return false }
        return true
    }, [listId, t])

    undoRef.current = undo

    return { start, starting, pending }
}
