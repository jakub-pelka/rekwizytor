'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'
import { createTerm, updateTerm, deleteTerm } from '@/app/actions/terms'
import { theatreNowNaive } from '@/lib/rk-format'

export type TermDialogProps = {
    mode: 'create' | 'edit'
    initialKind?: 'show' | 'rehearsal'
    performances: { id: string; title: string }[]
    term?: {
        id: string
        performanceId?: string
        performance_id?: string
        kind?: 'show' | 'rehearsal' | string
        showDate?: string
        show_date?: string
        title?: string | null
        termTitle?: string | null
        venue?: string | null
        note?: string | null
        cast?: string | null
        withProps?: boolean
        with_props?: boolean
    } | null
    defaultDate?: string
    hideDelete?: boolean
    onSaved?: () => void
    onClose: () => void
}

// Dodawanie i edycja terminu w kalendarzu (karty Modal, Input, Select, Controls).
// Bez krzyżyka w nagłówku; Esc = Anuluj; kliknięcie w tło nie zamyka.
export function TermDialog({
    mode,
    initialKind = 'show',
    performances,
    term,
    defaultDate,
    hideDelete = false,
    onSaved,
    onClose,
}: TermDialogProps) {
    const t = useTranslations('Terms')
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const performanceSelectRef = useRef<HTMLSelectElement>(null)

    const initialShowDate = term?.showDate ?? term?.show_date
    const initialDate = initialShowDate
        ? initialShowDate.slice(0, 10)
        : (defaultDate ?? theatreNowNaive().slice(0, 10))
    const initialTime = initialShowDate ? initialShowDate.slice(11, 16) : '19:00'
    const initialKindValue: 'show' | 'rehearsal' =
        term?.kind === 'rehearsal' || term?.kind === 'show'
            ? term.kind
            : initialKind

    const initialPerfId =
        term?.performanceId ??
        term?.performance_id ??
        (performances.length === 1 ? performances[0].id : '')

    const [kind, setKind] = useState<'show' | 'rehearsal'>(initialKindValue)
    const [performanceId, setPerformanceId] = useState(initialPerfId)
    const [date, setDate] = useState(initialDate)
    const [time, setTime] = useState(initialTime)
    const [cast, setCast] = useState(term?.cast ?? '')
    const [title, setTitle] = useState(term?.termTitle ?? term?.title ?? '')
    const [venue, setVenue] = useState(term?.venue ?? '')
    const [note, setNote] = useState(term?.note ?? '')
    const [withProps, setWithProps] = useState(term?.withProps ?? term?.with_props ?? true)

    const [performanceError, setPerformanceError] = useState<string | null>(null)
    const [dateError, setDateError] = useState<string | null>(null)
    const [timeError, setTimeError] = useState<string | null>(null)

    useEffect(() => {
        if (!initialPerfId && performanceSelectRef.current) {
            performanceSelectRef.current.focus()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (confirmDelete) {
                    setConfirmDelete(false)
                } else {
                    onClose()
                }
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [confirmDelete, initialPerfId, onClose])

    const save = () => {
        let hasError = false
        if (!performanceId.trim()) {
            setPerformanceError(t('performanceRequired'))
            hasError = true
        }
        if (!date.trim()) {
            setDateError(t('dateRequired'))
            hasError = true
        }
        if (!time.trim()) {
            setTimeError(t('timeRequired'))
            hasError = true
        }
        if (hasError) return

        startTransition(async () => {
            const inputData = {
                performanceId: performanceId.trim(),
                date: date.trim(),
                time: time.trim(),
                kind,
                cast: (kind === 'show' && cast ? cast : null) as 'first' | 'second' | 'other' | null,
                title: kind === 'rehearsal' ? (title.trim() || null) : null,
                venue: venue.trim() || null,
                note: note.trim() || null,
                withProps: kind === 'rehearsal' ? withProps : true,
            }

            const result = mode === 'edit' && term?.id
                ? await updateTerm({ ...inputData, id: term.id })
                : await createTerm(inputData)

            if (!result.ok) {
                notify.error(result.error)
                return
            }

            router.refresh()
            onSaved?.()
            onClose()
        })
    }

    const remove = () => {
        if (!term?.id) return
        startTransition(async () => {
            const result = await deleteTerm(term.id, term.performanceId ?? term.performance_id)
            if (!result.ok) {
                notify.error(result.error ?? t('deleteFailed'))
                return
            }
            router.refresh()
            onClose()
        })
    }

    if (confirmDelete && term) {
        return (
            <div className="rk-overlay fixed inset-0 z-50 rounded-none">
                <div className="rk-modal rk-modal--confirm" role="alertdialog" aria-labelledby="term-del-title">
                    <div className="rk-modal__head">
                        <div>
                            <h3 className="rk-modal__title" id="term-del-title">{t('deleteTitle')}</h3>
                            <p className="rk-modal__desc">{t('deleteDesc')}</p>
                        </div>
                    </div>
                    <div className="rk-modal__foot">
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button>
                        <Button variant="danger" onClick={remove} isLoading={pending} loadingLabel={t('deleting')}>{t('delete')}</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="rk-overlay fixed inset-0 z-50 overflow-y-auto rounded-none">
            <div className="rk-modal" role="dialog" aria-modal="true" aria-labelledby="term-dialog-title">
                <div className="rk-modal__head">
                    <h3 className="rk-modal__title" id="term-dialog-title">
                        {mode === 'edit'
                            ? t('editTitle')
                            : kind === 'show'
                                ? t('createShowTitle')
                                : t('createRehearsalTitle')}
                    </h3>
                </div>
                <form
                    className="rk-modal__body rk-stack"
                    onSubmit={e => { e.preventDefault(); save() }}
                    id="term-dialog-form"
                >
                    <div className="rk-field">
                        <span className="rk-label">{t('kind')}</span>
                        <div className="rk-tabs flex w-full" role="tablist" aria-label={t('kind')}>
                            <button
                                type="button"
                                className="rk-tab flex-1 inline-flex items-center justify-center"
                                role="tab"
                                aria-selected={kind === 'show'}
                                onClick={() => setKind('show')}
                            >
                                {t('kindShow')}
                            </button>
                            <button
                                type="button"
                                className="rk-tab flex-1 inline-flex items-center justify-center"
                                role="tab"
                                aria-selected={kind === 'rehearsal'}
                                onClick={() => setKind('rehearsal')}
                            >
                                {t('kindRehearsal')}
                            </button>
                        </div>
                    </div>

                    <label className="rk-field">
                        <span className="rk-label">{t('performance')}</span>
                        <span className="rk-select">
                            <select
                                ref={performanceSelectRef}
                                value={performanceId}
                                onChange={e => {
                                    setPerformanceId(e.target.value)
                                    setPerformanceError(null)
                                }}
                            >
                                <option value="">{t('selectPerformance')}</option>
                                {performances.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                            <ChevronDown />
                        </span>
                        {performanceError && <span className="rk-hint rk-hint--error">{performanceError}</span>}
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="rk-field">
                            <span className="rk-label">{t('date')}</span>
                            <input
                                type="date"
                                className={`rk-input ${dateError ? 'rk-input--error' : ''}`}
                                value={date}
                                onChange={e => {
                                    setDate(e.target.value)
                                    setDateError(null)
                                }}
                                aria-invalid={!!dateError}
                            />
                            {dateError && <span className="rk-hint rk-hint--error">{dateError}</span>}
                        </label>

                        <label className="rk-field">
                            <span className="rk-label">{t('time')}</span>
                            <input
                                type="time"
                                className={`rk-input ${timeError ? 'rk-input--error' : ''}`}
                                value={time}
                                onChange={e => {
                                    setTime(e.target.value)
                                    setTimeError(null)
                                }}
                                aria-invalid={!!timeError}
                            />
                            {timeError && <span className="rk-hint rk-hint--error">{timeError}</span>}
                        </label>
                    </div>

                    {kind === 'show' && (
                        <label className="rk-field">
                            <span className="rk-label">{t('cast')}</span>
                            <span className="rk-select">
                                <select value={cast} onChange={e => setCast(e.target.value)}>
                                    <option value="">{t('castAll')}</option>
                                    <option value="first">{t('castA')}</option>
                                    <option value="second">{t('castB')}</option>
                                </select>
                                <ChevronDown />
                            </span>
                        </label>
                    )}

                    {kind === 'rehearsal' && (
                        <>
                            <label className="rk-field">
                                <span className="rk-label">{t('rehearsalTitle')}</span>
                                <input
                                    type="text"
                                    className="rk-input"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder={t('rehearsalTitlePlaceholder')}
                                />
                            </label>

                            <label className="rk-field">
                                <span className="rk-label">{t('venue')}</span>
                                <input
                                    type="text"
                                    className="rk-input"
                                    value={venue}
                                    onChange={e => setVenue(e.target.value)}
                                    placeholder={t('venuePlaceholder')}
                                />
                            </label>

                            <label className="rk-field">
                                <span className="rk-label">{t('note')}</span>
                                <input
                                    type="text"
                                    className="rk-input"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder={t('notePlaceholder')}
                                />
                            </label>

                            <div className="rk-field">
                                <label className="rk-switch">
                                    <input
                                        type="checkbox"
                                        checked={withProps}
                                        onChange={e => setWithProps(e.target.checked)}
                                    />
                                    <span className="rk-track" />
                                    <span>{t('withProps')}</span>
                                </label>
                                <span className="rk-hint">{t('withPropsHint')}</span>
                            </div>
                        </>
                    )}
                </form>

                <div className="rk-modal__foot">
                    {mode === 'edit' && term && !hideDelete && (
                        <Button variant="ghost" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                            {t('deleteEllipsis')}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" form="term-dialog-form" isLoading={pending}>
                        {t('save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
