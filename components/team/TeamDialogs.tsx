'use client'

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Info, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { checkInviteEmail, inviteToTeam } from '@/app/actions/team'
import type { TheatreRole } from '@/lib/team'

export const ROLES: TheatreRole[] = ['admin', 'member', 'viewer']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_KEY = { admin: 'roleAdmin', member: 'roleMember', viewer: 'roleViewer' } as const
const DESC_KEY = { admin: 'roleDescAdmin', member: 'roleDescMember', viewer: 'roleDescViewer' } as const

// Tło i okno (karta Modal). Na telefonie okno siada przy dolnej krawędzi jak arkusz (.rk-sheet w planszach).
function Dialog({ children, onClose, confirm = false, labelId, descId }: {
    children: ReactNode; onClose: () => void; confirm?: boolean; labelId: string; descId?: string
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])
    return (
        <div className="rk-overlay fixed inset-0 z-50 rounded-none" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div
                className={`rk-modal ${confirm ? 'rk-modal--confirm' : ''} max-md:!absolute max-md:!inset-x-0 max-md:!bottom-0 max-md:!w-full max-md:!max-w-none max-md:!rounded-b-none`}
                role={confirm ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby={labelId}
                aria-describedby={descId}
            >
                {children}
            </div>
        </div>
    )
}

/** Wybór roli jako trzy przyciski radiowe z opisem (.zp-roles z planszy). */
export function RoleChoice({ value, onChange, label }: { value: TheatreRole; onChange: (r: TheatreRole) => void; label: string }) {
    const t = useTranslations('Team')
    return (
        <div className="zp-roles" role="radiogroup" aria-label={label}>
            {ROLES.map(r => (
                <button key={r} type="button" className="zp-role" role="radio" aria-checked={value === r} onClick={() => onChange(r)}>
                    <span className="r" />
                    <span><b>{t(ROLE_KEY[r])}</b><small>{t(DESC_KEY[r])}</small></span>
                </button>
            ))}
        </div>
    )
}

// Stan 1–3 planszy „Zespół-akcje”: adres, rola (domyślnie Rekwizytor), podpowiedź o istniejącym koncie, błąd przy polu.
export function InviteDialog({ theatreName, onClose, onDone }: {
    theatreName: string
    onClose: () => void
    onDone: (result: { email: string; invited: boolean }) => void
}) {
    const t = useTranslations('Team')
    const titleId = useId()
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<TheatreRole>('member')
    const [checked, setChecked] = useState<{ email: string; state: 'new' | 'existing' | 'member' } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const inputRef = useRef<HTMLInputElement>(null)

    // Po wpisaniu poprawnego adresu sprawdzamy, czy osoba ma już konto albo jest w zespole.
    useEffect(() => {
        const value = email.trim()
        if (!EMAIL_RE.test(value)) return
        let alive = true
        const timer = setTimeout(async () => {
            const res = await checkInviteEmail(value)
            if (alive && res.ok && res.data) setChecked({ email: value, state: res.data.state })
        }, 350)
        return () => { alive = false; clearTimeout(timer) }
    }, [email])

    const state = checked && checked.email === email.trim() ? checked.state : null

    const fail = (message: string) => { setError(message); inputRef.current?.focus() }

    const submit = () => {
        const value = email.trim()
        if (!EMAIL_RE.test(value)) return fail(t('emailInvalid'))
        if (state === 'member') return fail(t('emailMember'))
        startTransition(async () => {
            const res = await inviteToTeam(value, role)
            if (!res.ok) return fail(res.error)
            onDone({ email: value, invited: res.data?.invited ?? true })
        })
    }

    const hint = error ?? (state === 'member' ? t('emailMember') : state === 'existing' ? t('emailExisting') : t('emailHint'))
    const hintError = Boolean(error) || state === 'member'

    return (
        <Dialog onClose={onClose} labelId={titleId}>
            <form onSubmit={e => { e.preventDefault(); submit() }} noValidate>
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id={titleId}>{t('inviteTitle')}</h3>
                        <p className="rk-modal__desc">{theatreName}</p>
                    </div>
                </div>
                <div className="rk-modal__body rk-stack">
                    <label className="rk-field">
                        <span className="rk-label">{t('emailLabel')}</span>
                        <input
                            ref={inputRef}
                            className={`rk-input ${hintError ? 'rk-input--error' : ''}`}
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            autoFocus
                            placeholder={t('emailPlaceholder')}
                            value={email}
                            aria-invalid={hintError || undefined}
                            onChange={e => { setEmail(e.target.value); setError(null) }}
                        />
                        <span className={`rk-hint ${hintError ? 'rk-hint--error' : ''}`} aria-live="polite">{hint}</span>
                    </label>
                    <div className="rk-field">
                        <span className="rk-label">{t('roleField')}</span>
                        <RoleChoice value={role} onChange={setRole} label={t('roleField')} />
                    </div>
                </div>
                <div className="rk-modal__foot">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" isLoading={pending} loadingLabel={t('sending')} leftIcon={<Send />}>{t('send')}</Button>
                </div>
            </form>
        </Dialog>
    )
}

/** „Zmień rolę…” z menu wiersza: te same trzy role co w zaproszeniu. */
export function RoleDialog({ name, current, onClose, onSave }: {
    name: string; current: TheatreRole; onClose: () => void; onSave: (role: TheatreRole) => Promise<void>
}) {
    const t = useTranslations('Team')
    const titleId = useId()
    const [role, setRole] = useState<TheatreRole>(current)
    const [pending, startTransition] = useTransition()
    return (
        <Dialog onClose={onClose} labelId={titleId}>
            <div className="rk-modal__head">
                <div><h3 className="rk-modal__title" id={titleId}>{t('roleDialogTitle', { name })}</h3></div>
            </div>
            <div className="rk-modal__body">
                <RoleChoice value={role} onChange={setRole} label={t('roleField')} />
            </div>
            <div className="rk-modal__foot">
                <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                <Button
                    isLoading={pending}
                    loadingLabel={t('saving')}
                    disabled={role === current}
                    onClick={() => startTransition(async () => { await onSave(role) })}
                >{t('save')}</Button>
            </div>
        </Dialog>
    )
}

// Stan 4: usuwanie z zespołu. Mówimy, co zostaje.
export function RemoveDialog({ name, theatreName, onClose, onConfirm }: {
    name: string; theatreName: string; onClose: () => void; onConfirm: () => Promise<void>
}) {
    const t = useTranslations('Team')
    const titleId = useId()
    const descId = useId()
    const [pending, startTransition] = useTransition()
    return (
        <Dialog onClose={onClose} confirm labelId={titleId} descId={descId}>
            <div className="rk-modal__head">
                <span className="rk-modal__icon rk-modal__icon--danger"><Trash2 /></span>
                <div>
                    <h3 className="rk-modal__title" id={titleId}>{t('removeTitle', { name })}</h3>
                    <p className="rk-modal__desc" id={descId}>{t('removeDesc', { theatre: theatreName })}</p>
                </div>
            </div>
            <div className="rk-modal__foot">
                <Button variant="ghost" onClick={onClose} autoFocus>{t('cancel')}</Button>
                <Button variant="danger" isLoading={pending} loadingLabel={t('removing')} onClick={() => startTransition(async () => { await onConfirm() })}>
                    {t('removeConfirm')}
                </Button>
            </div>
        </Dialog>
    )
}

// Stan 5: ostatni kierownik. Okno blokuje i podpowiada krok.
export function LastManagerDialog({ kind, onClose, onGoTeam }: { kind: 'remove' | 'role'; onClose: () => void; onGoTeam: () => void }) {
    const t = useTranslations('Team')
    const titleId = useId()
    const descId = useId()
    return (
        <Dialog onClose={onClose} confirm labelId={titleId} descId={descId}>
            <div className="rk-modal__head">
                <span className="rk-modal__icon"><Info /></span>
                <div>
                    <h3 className="rk-modal__title" id={titleId}>{kind === 'remove' ? t('lastTitleRemove') : t('lastTitleRole')}</h3>
                    <p className="rk-modal__desc" id={descId}>{t('lastDesc')}</p>
                </div>
            </div>
            <div className="rk-modal__foot">
                <Button variant="ghost" onClick={onGoTeam}>{t('lastGoTeam')}</Button>
                <Button onClick={onClose} autoFocus>{t('lastOk')}</Button>
            </div>
        </Dialog>
    )
}
