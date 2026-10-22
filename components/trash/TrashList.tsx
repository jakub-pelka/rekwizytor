'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Undo2 } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { restorePerformance, trashPerformance } from '@/app/actions/performance-trash'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/rk/EmptyState'
import { notify } from '@/utils/notify'
import { longDate, plural, theatreDate } from '@/lib/rk-format'
import type { Database } from '@/types/supabase'

type Performance = Database['public']['Tables']['performances']['Row']

const byDeletedDesc = (a: Performance, b: Performance) => (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '')

// Kosz: usunięte spektakle. Przywrócenie ma „Cofnij” (wraca do kosza), usunięcie na zawsze pyta o potwierdzenie.
export function TrashList({ initialPerformances }: { readonly initialPerformances: Performance[] }) {
    const t = useTranslations('Trash')
    const router = useRouter()
    const supabase = createClient()
    const [pending, start] = useTransition()

    const [performances, setPerformances] = useState(initialPerformances)
    const [busy, setBusy] = useState<string | null>(null)
    const [confirming, setConfirming] = useState<Performance | null>(null)
    const cancelRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!confirming) return
        cancelRef.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(null) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [confirming])

    const restore = async (perf: Performance) => {
        setBusy(perf.id)
        const result = await restorePerformance(perf.id)
        setBusy(null)
        if (!result.ok) { notify.error(t('restoreFailed')); return }
        setPerformances(prev => prev.filter(p => p.id !== perf.id))
        notify.undo(t('restored', { title: perf.title }), t('undo'), async () => {
            const back = await trashPerformance(perf.id)
            if (!back.ok) { notify.error(back.error ?? t('undoFailed')); return }
            setPerformances(prev => [...prev, { ...perf, deleted_at: new Date().toISOString() }].sort(byDeletedDesc))
            router.refresh()
        }, `trash-restore-${perf.id}`)
        router.refresh()
    }

    const deleteForever = (perf: Performance) => {
        setConfirming(null)
        start(async () => {
            const { error } = await supabase.from('performances').delete().eq('id', perf.id)
            if (error) { notify.error(t('deleteFailed')); return }
            setPerformances(prev => prev.filter(p => p.id !== perf.id))
            notify.success(t('deleted', { title: perf.title }))
            router.refresh()
        })
    }

    if (performances.length === 0) {
        return <EmptyState art="up" title={t('emptyTitle')}>{t('emptyText')}</EmptyState>
    }

    return (
        <section className="pl-sect" aria-labelledby="trash-performances">
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id="trash-performances">{t('performances')}</h2>
                <span className="rk-tally">{plural(performances.length, ['spektakl', 'spektakle', 'spektakli'])}</span>
            </div>
            <ul className="pl-list">
                {performances.map(perf => (
                    <li key={perf.id}>
                        {perf.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <span className="rk-poster"><img src={perf.image_url} alt="" loading="lazy" /></span>
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <span className="rk-poster rk-poster--empty" title={t('noPoster')}><img src="/brand/rekwizytor-znak-mono-bialy.svg" alt="" /></span>
                        )}
                        <span className="pl-main">
                            <b className="sl-title">{perf.title}</b>
                            {perf.deleted_at && <small>{t('deletedOn', { date: longDate(theatreDate(perf.deleted_at)).toLowerCase() })}</small>}
                        </span>
                        <Button variant="secondary" size="sm" leftIcon={<Undo2 />} onClick={() => restore(perf)} disabled={busy === perf.id || pending}>
                            {t('restore')}
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 />} onClick={() => setConfirming(perf)} disabled={busy === perf.id || pending}>
                            <span className="max-md:sr-only">{t('deleteForever')}</span>
                        </Button>
                    </li>
                ))}
            </ul>

            {confirming && (
                <div className="rk-overlay fixed inset-0 z-50 overflow-y-auto rounded-none">
                    <div className="rk-modal rk-modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="trash-del-title" aria-describedby="trash-del-desc">
                        <div className="rk-modal__head">
                            <span className="rk-modal__icon rk-modal__icon--danger"><Trash2 /></span>
                            <div>
                                <h3 className="rk-modal__title" id="trash-del-title">{t('deleteTitle', { title: confirming.title })}</h3>
                                <p className="rk-modal__desc" id="trash-del-desc">{t('deleteDesc')}</p>
                            </div>
                        </div>
                        <div className="rk-modal__foot">
                            <Button ref={cancelRef} variant="ghost" onClick={() => setConfirming(null)}>{t('cancel')}</Button>
                            <Button variant="danger" onClick={() => deleteForever(confirming)}>{t('deleteConfirm')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
