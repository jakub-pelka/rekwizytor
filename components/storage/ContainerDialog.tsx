'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'
import { createContainer, type ContainerKind } from '@/app/actions/containers'

export type ParentOption = { id: string; label: string }

// Nowy pojemnik (szafa, półka, kufer, pudło): karta Modal, bez krzyżyka, Esc to „Anuluj”.
export function ContainerDialog({ parents, defaultParent, onClose }: { parents: ParentOption[]; defaultParent: string; onClose: () => void }) {
    const t = useTranslations('Container')
    const router = useRouter()
    const [pending, start] = useTransition()
    const [name, setName] = useState('')
    const [kind, setKind] = useState<ContainerKind>('shelf')
    const [parent, setParent] = useState(defaultParent)
    const [error, setError] = useState<string | null>(null)
    const ref = useRef<HTMLInputElement>(null)

    useEffect(() => {
        ref.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const save = () => {
        if (!name.trim()) { setError(t('nameRequired')); ref.current?.focus(); return }
        start(async () => {
            const result = await createContainer({ name, kind, parentId: parent })
            if (!result.ok) { setError(result.error); return }
            notify.success(t('created', { name: name.trim() }))
            router.refresh()
            onClose()
        })
    }

    return (
        <div className="rk-overlay fixed inset-0 z-50 overflow-y-auto rounded-none">
            <div className="rk-modal" role="dialog" aria-modal="true" aria-labelledby="container-title">
                <div className="rk-modal__head"><h3 className="rk-modal__title" id="container-title">{t('title')}</h3></div>
                <form className="rk-modal__body rk-stack" id="container-form" onSubmit={e => { e.preventDefault(); save() }}>
                    <label className="rk-field">
                        <span className="rk-label">{t('name')}</span>
                        <input ref={ref} className={`rk-input ${error ? 'rk-input--error' : ''}`} value={name} onChange={e => { setName(e.target.value); setError(null) }} placeholder={t('namePlaceholder')} aria-invalid={!!error} />
                        {error && <span className="rk-hint rk-hint--error">{error}</span>}
                    </label>
                    <label className="rk-field">
                        <span className="rk-label">{t('kind')}</span>
                        <span className="rk-select">
                            <select value={kind} onChange={e => setKind(e.target.value as ContainerKind)}>
                                {(['wardrobe', 'shelf', 'trunk', 'box'] as const).map(k => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
                            </select>
                            <ChevronDown />
                        </span>
                    </label>
                    <label className="rk-field">
                        <span className="rk-label">{t('parent')}</span>
                        <span className="rk-select">
                            <select value={parent} onChange={e => setParent(e.target.value)}>
                                {parents.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                            <ChevronDown />
                        </span>
                        <span className="rk-hint">{t('depthHint')}</span>
                    </label>
                </form>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" form="container-form" isLoading={pending}>{t('add')}</Button>
                </div>
            </div>
        </div>
    )
}
