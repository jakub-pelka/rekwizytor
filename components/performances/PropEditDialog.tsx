'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'
import { deletePerformanceProp, savePerformanceProp } from '@/app/actions/save-performance-prop'
import type { PerformanceStructure, StructuredProp } from '@/lib/performance-structure'
import { roman } from '@/lib/rk-format'

export type GroupOption = { id: string; label: string }

type Props = {
    performanceId: string
    structure: PerformanceStructure
    groups: GroupOption[]
    /** Rekwizyt do edycji albo miejsce, do którego dodajemy nowy. */
    prop: StructuredProp | null
    defaults?: { scene: number | null; act: number | null }
    onClose: () => void
}

// Edycja rekwizytu (karty Modal, Input, Textarea, Select). Jedno pole opisu: model dzieli je
// na „jak” i „gdzie” przy zapisie (POMYSLY 5); informacja o tym tylko tutaj, nie przy każdym wierszu.
export function PropEditDialog({ performanceId, structure, groups, prop, defaults, onClose }: Props) {
    const t = useTranslations('PropEdit')
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const nameRef = useRef<HTMLInputElement>(null)

    const initialPlace = prop
        ? prop.scene != null ? `s:${prop.scene}` : prop.act != null ? `a:${prop.act}` : ''
        : defaults?.scene != null ? `s:${defaults.scene}` : defaults?.act != null ? `a:${defaults.act}` : ''

    const [name, setName] = useState(prop?.name ?? '')
    const [description, setDescription] = useState(prop?.description ?? '')
    const [place, setPlace] = useState(initialPlace)
    const [groupId, setGroupId] = useState(prop?.group?.id ?? '')
    const [castOnly, setCastOnly] = useState(prop?.castOnly ?? '')
    const [area, setArea] = useState(prop?.area ?? '')
    const [nameError, setNameError] = useState<string | null>(null)

    useEffect(() => {
        nameRef.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const save = () => {
        if (!name.trim()) {
            setNameError(t('nameRequired'))
            nameRef.current?.focus()
            return
        }
        const [kind, value] = place.split(':')
        startTransition(async () => {
            const result = await savePerformanceProp({
                id: prop?.id,
                performanceId,
                name,
                description,
                sceneNumber: kind === 's' ? Number(value) : null,
                actNumber: kind === 'a' ? Number(value) : null,
                groupId: groupId || null,
                castOnly: (castOnly || null) as 'first' | 'second' | null,
                area: area || null,
            })
            if (!result.ok) {
                notify.error(result.error)
                return
            }
            router.refresh()
            onClose()
        })
    }

    const remove = () => {
        if (!prop) return
        startTransition(async () => {
            const result = await deletePerformanceProp(prop.id, performanceId)
            if (!result.ok) {
                notify.error(result.error ?? t('deleteFailed'))
                return
            }
            router.refresh()
            onClose()
        })
    }

    const areas = [...new Set(structure.props.map(p => p.area).filter((a): a is string => !!a))]

    if (confirmDelete && prop) {
        return (
            <div className="rk-overlay fixed inset-0 z-50 rounded-none">
                <div className="rk-modal rk-modal--confirm" role="alertdialog" aria-labelledby="prop-del-title">
                    <div className="rk-modal__head">
                        <div>
                            <h3 className="rk-modal__title" id="prop-del-title">{t('deleteTitle', { name: prop.name })}</h3>
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
            <div className="rk-modal" role="dialog" aria-modal="true" aria-labelledby="prop-edit-title">
                <div className="rk-modal__head">
                    <h3 className="rk-modal__title" id="prop-edit-title">{prop ? t('editTitle') : t('addTitle')}</h3>
                </div>
                <form
                    className="rk-modal__body rk-stack"
                    onSubmit={e => { e.preventDefault(); save() }}
                    id="prop-edit-form"
                >
                    <label className="rk-field">
                        <span className="rk-label">{t('name')}</span>
                        <input
                            ref={nameRef}
                            className={`rk-input ${nameError ? 'rk-input--error' : ''}`}
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(null) }}
                            placeholder={t('namePlaceholder')}
                            aria-invalid={!!nameError}
                        />
                        {nameError && <span className="rk-hint rk-hint--error">{nameError}</span>}
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('description')}</span>
                        <textarea
                            className="rk-textarea"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                        />
                        <span className="rk-hint">
                            {prop?.structured && prop.description === description ? t('structuredInfo') : t('descriptionHelp')}
                        </span>
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('scene')}</span>
                        <span className="rk-select">
                            <select value={place} onChange={e => setPlace(e.target.value)}>
                                <option value="">{t('noScene')}</option>
                                {structure.preparation.map(s => (
                                    <option key={s.id} value={`s:${s.number}`}>{`${s.code} · ${s.name}`}</option>
                                ))}
                                {structure.acts.map(a => (
                                    <optgroup key={a.act} label={t('act', { act: roman(a.act) })}>
                                        <option value={`a:${a.act}`}>{t('wholeAct', { act: roman(a.act) })}</option>
                                        {a.scenes.map(s => <option key={s.id} value={`s:${s.number}`}>{`${s.code} · ${s.name}`}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <ChevronDown />
                        </span>
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('area')}</span>
                        <input
                            className="rk-input"
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            list="prop-areas"
                            placeholder={t('areaPlaceholder')}
                        />
                        <datalist id="prop-areas">{areas.map(a => <option key={a} value={a} />)}</datalist>
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('from')}</span>
                        <span className="rk-select">
                            <select value={groupId} onChange={e => setGroupId(e.target.value)}>
                                <option value="">{t('noGroup')}</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                            <ChevronDown />
                        </span>
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('cast')}</span>
                        <span className="rk-select">
                            <select value={castOnly} onChange={e => setCastOnly(e.target.value)}>
                                <option value="">{t('castAll')}</option>
                                <option value="first">{t('castOnly', { cast: 'A' })}</option>
                                <option value="second">{t('castOnly', { cast: 'B' })}</option>
                            </select>
                            <ChevronDown />
                        </span>
                    </label>
                </form>
                <div className="rk-modal__foot">
                    {prop && (
                        <Button variant="ghost" className="mr-auto" onClick={() => setConfirmDelete(true)}>{t('deleteEllipsis')}</Button>
                    )}
                    <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" form="prop-edit-form" isLoading={pending}>{t('save')}</Button>
                </div>
            </div>
        </div>
    )
}
