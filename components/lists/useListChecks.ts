'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Stage } from '@/lib/performance-structure'

export type ListCheck = { performance_prop_id: string; stage: string }
export type SyncState = { offline: boolean; pending: number; syncing: boolean; saved: boolean; failed: boolean }

type Op = { propId: string; stage: string; add: boolean }

const key = (propId: string, stage: string) => `${stage}:${propId}`
const applyOp = (set: Set<string>, op: { propId: string; stage: string; add: boolean }) => {
    if (op.add) set.add(key(op.propId, op.stage))
    else set.delete(key(op.propId, op.stage))
}
const storageKey = (listId: string) => `rk-pending-checks:${listId}`

function readQueue(listId: string): Op[] {
    try { return JSON.parse(localStorage.getItem(storageKey(listId)) ?? '[]') as Op[] } catch { return [] }
}
function writeQueue(listId: string, ops: Op[]) {
    try {
        if (ops.length) localStorage.setItem(storageKey(listId), JSON.stringify(ops))
        else localStorage.removeItem(storageKey(listId))
    } catch { /* tryb prywatny: kolejka zostaje w pamięci */ }
}

const isNetworkError = (e: { message?: string } | null) =>
    !navigator.onLine || (!!e?.message && /fetch|network|load failed/i.test(e.message))

// Odhaczenia jednej listy zadań (POMYSLY 8: praca bez sieci). Zapis optymistyczny; gdy sieci nie ma,
// zmiany czekają w kolejce na urządzeniu i wysyłają się same po powrocie połączenia.
// Zmiany z innych telefonów przychodzą przez realtime.
// localOnly (podgląd, demo bez logowania): odhaczenia działają tylko na tym ekranie, nic nie idzie na serwer,
// więc nie ma też komunikatów o błędach zapisu.
export function useListChecks(listId: string, initial: ListCheck[], { localOnly = false }: { localOnly?: boolean } = {}) {
    const [checked, setChecked] = useState(() => new Set(initial.map(c => key(c.performance_prop_id, c.stage))))
    const [sync, setSync] = useState<SyncState>({ offline: false, pending: 0, syncing: false, saved: false, failed: false })
    const queue = useRef<Op[]>([])
    const flushing = useRef(false)

    const send = useCallback(async (op: Op) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        return op.add
            ? supabase.from('show_list_checks').upsert(
                { show_list_id: listId, performance_prop_id: op.propId, stage: op.stage, done_by: user?.id ?? null },
                { onConflict: 'show_list_id,performance_prop_id,stage', ignoreDuplicates: true })
            : supabase.from('show_list_checks').delete()
                .eq('show_list_id', listId).eq('performance_prop_id', op.propId).eq('stage', op.stage)
    }, [listId])

    const enqueue = useCallback((op: Op) => {
        // Ostatnia zmiana tego samego wpisu zastępuje wcześniejszą.
        queue.current = [...queue.current.filter(o => key(o.propId, o.stage) !== key(op.propId, op.stage)), op]
        writeQueue(listId, queue.current)
        setSync(s => ({ ...s, pending: queue.current.length, offline: !navigator.onLine || s.offline }))
    }, [listId])

    const flush = useCallback(async () => {
        if (flushing.current || queue.current.length === 0 || !navigator.onLine) return
        flushing.current = true
        setSync(s => ({ ...s, syncing: true, offline: false, failed: false }))
        while (queue.current.length) {
            const op = queue.current[0]
            const { error } = await send(op)
            if (error) {
                const network = isNetworkError(error)
                setSync(s => ({ ...s, syncing: false, offline: network, failed: !network }))
                flushing.current = false
                return
            }
            queue.current = queue.current.slice(1)
            writeQueue(listId, queue.current)
            setSync(s => ({ ...s, pending: queue.current.length }))
        }
        flushing.current = false
        setSync(s => ({ ...s, syncing: false, saved: true, pending: 0 }))
        setTimeout(() => setSync(s => ({ ...s, saved: false })), 3000)
    }, [listId, send])

    // Kolejka z poprzedniej wizyty (np. telefon stracił sieć i aplikację zamknięto).
    useEffect(() => {
        if (localOnly) return
        queue.current = readQueue(listId)
        if (queue.current.length) {
            setChecked(prev => {
                const next = new Set(prev)
                for (const op of queue.current) applyOp(next, op)
                return next
            })
            setSync(s => ({ ...s, pending: queue.current.length, offline: !navigator.onLine }))
            void flush()
        } else if (!navigator.onLine) {
            setSync(s => ({ ...s, offline: true }))
        }
        const onOnline = () => { setSync(s => ({ ...s, offline: false })); void flush() }
        const onOffline = () => setSync(s => ({ ...s, offline: true }))
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
    }, [listId, flush, localOnly])

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel(`show_list_checks:${listId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'show_list_checks', filter: `show_list_id=eq.${listId}` }, payload => {
                if (payload.eventType === 'INSERT') {
                    const row = payload.new as ListCheck
                    setChecked(prev => new Set(prev).add(key(row.performance_prop_id, row.stage)))
                } else if (payload.eventType === 'DELETE') {
                    // DELETE niesie tylko klucz główny, więc odświeżamy stan z bazy (bez czekających zmian).
                    void supabase.from('show_list_checks').select('performance_prop_id, stage').eq('show_list_id', listId)
                        .then(({ data }) => {
                            if (!data) return
                            const next = new Set(data.map(c => key(c.performance_prop_id, c.stage)))
                            for (const op of queue.current) applyOp(next, op)
                            setChecked(next)
                        })
                }
            })
            .subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [listId])

    const isChecked = useCallback((propId: string, stage: Stage | 'live') => checked.has(key(propId, stage)), [checked])

    const toggle = useCallback(async (propId: string, stage: Stage | 'live') => {
        const k = key(propId, stage)
        const op: Op = { propId, stage, add: !checked.has(k) }
        setChecked(prev => {
            const next = new Set(prev)
            if (op.add) next.add(k)
            else next.delete(k)
            return next
        })
        if (localOnly) return

        if (!navigator.onLine || queue.current.length) {
            enqueue(op)
            void flush()
            return
        }
        const { error } = await send(op)
        if (!error) return
        if (isNetworkError(error)) {
            enqueue(op)
            return
        }
        // Błąd serwera (np. brak uprawnień): kolejka z „Ponów”, zmiana zostaje widoczna.
        enqueue(op)
        setSync(s => ({ ...s, failed: true }))
    }, [checked, enqueue, flush, send, localOnly])

    const retry = useCallback(() => { void flush() }, [flush])

    return { isChecked, toggle, sync, retry }
}
