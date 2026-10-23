'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'

const isNetworkError = (e: { message?: string } | null) =>
    !navigator.onLine || (!!e?.message && /fetch|network|load failed/i.test(e.message))

// „Zakończ spektakl”: zapisuje koniec w show_lists.live_ended_at i pokazuje „Spektakl zakończony” z „Cofnij”.
// Zakończenie wymaga sieci (bez kolejki w localStorage): bez połączenia pokazujemy komunikat i nie udajemy sukcesu.
// Zapis sprawdza zwrócony wiersz, więc odrzucenie przez RLS (0 wierszy) też jest porażką.
export function useLiveEnd(listId: string, userId: string | null, onEnded: () => void, onUndone: () => void) {
    const t = useTranslations('Live')
    const [ending, setEnding] = useState(false)
    const onEndedRef = useRef(onEnded)
    const onUndoneRef = useRef(onUndone)
    onEndedRef.current = onEnded
    onUndoneRef.current = onUndone

    // Cofnięcie czyści tylko koniec, który sami zapisaliśmy.
    const undo = useCallback(async (at: string) => {
        try {
            const { data, error } = await createClient().from('show_lists')
                .update({ live_ended_at: null, live_updated_by: userId })
                .eq('id', listId)
                .eq('live_ended_at', at)
                .select('id')
            if (error || !data?.length) { notify.error(t('endUndoFailed')); return }
            notify.success(t('endUndone'))
            onUndoneRef.current()
        } catch { notify.error(t('endUndoFailed')) }
    }, [listId, userId, t])

    const end = useCallback(async () => {
        if (!navigator.onLine) { notify.error(t('endOffline')); return }
        const at = new Date().toISOString()
        setEnding(true)
        try {
            const { data, error } = await createClient().from('show_lists')
                .update({ live_ended_at: at, live_updated_by: userId })
                .eq('id', listId)
                .select('id')
            if (error || !data?.length) { notify.error(isNetworkError(error) ? t('endOffline') : t('endFailed')); return }
            notify.undo(t('ended'), t('endUndo'), () => { void undo(at) })
            onEndedRef.current()
        } catch {
            // fetch rzucił wyjątek (np. utrata połączenia w trakcie)
            notify.error(t('endOffline'))
        } finally {
            setEnding(false)
        }
    }, [listId, userId, t, undo])

    return { end, ending }
}

// „Wznów tryb na żywo” na liście zadań: dla terminu zakończonego w bieżącym oknie 4 h czyści live_ended_at
// i wraca do /lists/<id>/live; „Cofnij” przywraca poprzednią wartość live_ended_at.
export function useLiveResume(listId: string, endedAt: string | null | undefined, onResumed: () => void, onUndone: () => void) {
    const t = useTranslations('Live')
    const [resuming, setResuming] = useState(false)
    const onResumedRef = useRef(onResumed)
    const onUndoneRef = useRef(onUndone)
    onResumedRef.current = onResumed
    onUndoneRef.current = onUndone

    const undo = useCallback(async (previous: string) => {
        try {
            const { data, error } = await createClient().from('show_lists')
                .update({ live_ended_at: previous })
                .eq('id', listId)
                .is('live_ended_at', null)
                .select('id')
            if (error || !data?.length) { notify.error(t('resumeUndoFailed')); return }
            notify.success(t('ended'))
            onUndoneRef.current()
        } catch { notify.error(t('resumeUndoFailed')) }
    }, [listId, t])

    const resume = useCallback(async () => {
        if (!endedAt) return
        if (!navigator.onLine) { notify.error(t('resumeOffline')); return }
        const previous = endedAt
        setResuming(true)
        try {
            const { data, error } = await createClient().from('show_lists')
                .update({ live_ended_at: null })
                .eq('id', listId)
                .not('live_ended_at', 'is', null)
                .select('id')
            if (error || !data?.length) { notify.error(isNetworkError(error) ? t('resumeOffline') : t('resumeFailed')); return }
            notify.undo(t('endUndone'), t('endUndo'), () => { void undo(previous) })
            onResumedRef.current()
        } catch {
            notify.error(t('resumeOffline'))
        } finally {
            setResuming(false)
        }
    }, [listId, endedAt, t, undo])

    return { resume, resuming }
}
