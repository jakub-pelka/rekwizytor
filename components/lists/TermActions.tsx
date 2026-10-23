'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { TermDialog } from '@/components/calendar/TermDialog'
import { deleteTerm } from '@/app/actions/terms'
import { notify } from '@/utils/notify'
import { dayMonth, time } from '@/lib/rk-format'

export type TermActionsTerm = {
    id: string
    performanceId: string
    performanceTitle: string
    showDate: string
    kind: string
    cast: string | null
    title: string | null
    venue: string | null
    note: string | null
    withProps: boolean
}

type TermActionsProps = {
    term: TermActionsTerm
    /** Zapis w bieżącym teatrze (canEdit / canWrite): bez niego nie pokazujemy nic. */
    canEdit: boolean
}

type TermDeleteConfirmProps = {
    /** „Wesele, 23.10, 19:00” */
    label: string
    pending: boolean
    onConfirm: () => void
    onCancel: () => void
}

// Okno potwierdzenia usunięcia terminu (karta Modal, wariant „confirm”): mówi, co zniknie.
function TermDeleteConfirm({ label, pending, onConfirm, onCancel }: TermDeleteConfirmProps) {
    const t = useTranslations('TermActions')

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onCancel])

    return (
        <div className="rk-overlay fixed inset-0 z-50 rounded-none">
            <div className="rk-modal rk-modal--confirm" role="dialog" aria-modal="true" aria-labelledby="term-actions-del-title">
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id="term-actions-del-title">{t('confirmTitle', { label })}</h3>
                        <p className="rk-modal__desc">{t('confirmDesc')}</p>
                    </div>
                </div>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
                    <Button variant="danger" onClick={onConfirm} isLoading={pending} loadingLabel={t('deleting')}>{t('delete')}</Button>
                </div>
            </div>
        </div>
    )
}

// „Edytuj termin” i „Usuń termin” w nagłówku listy zadań i trybu na żywo. Ciche (ghost), tylko dla osób z zapisem.
export function TermActions({ term, canEdit }: TermActionsProps) {
    const t = useTranslations('TermActions')
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [editing, setEditing] = useState(false)
    const [confirming, setConfirming] = useState(false)

    if (!canEdit) return null

    const when = new Date(term.showDate)
    const label = `${term.kind === 'rehearsal' && term.title ? term.title : term.performanceTitle}, ${dayMonth(when)}, ${time(when)}`

    const remove = () => {
        startTransition(async () => {
            const result = await deleteTerm(term.id, term.performanceId)
            if (!result.ok) {
                notify.error(result.error ?? t('deleteFailed'))
                setConfirming(false)
                return
            }
            notify.success(t('deleted'))
            router.push('/calendar')
        })
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{t('edit')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>{t('remove')}</Button>
            </div>
            {editing && (
                <TermDialog
                    mode="edit"
                    hideDelete
                    performances={[{ id: term.performanceId, title: term.performanceTitle }]}
                    term={{
                        id: term.id,
                        performanceId: term.performanceId,
                        kind: term.kind,
                        showDate: term.showDate,
                        title: term.title,
                        venue: term.venue,
                        note: term.note,
                        cast: term.cast,
                        withProps: term.withProps,
                    }}
                    onSaved={() => router.push(`/lists/${term.id}`)}
                    onClose={() => setEditing(false)}
                />
            )}
            {confirming && (
                <TermDeleteConfirm label={label} pending={pending} onConfirm={remove} onCancel={() => setConfirming(false)} />
            )}
        </>
    )
}
