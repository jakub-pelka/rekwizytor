'use client'

import { useState, useTransition } from 'react'
import { dayMonth, time } from '@/lib/rk-format'
import { useTranslations } from 'next-intl'
import { ChevronDown, Plus } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { notify } from '@/utils/notify'
import {
    addTheatreMember, createTheatre, removeTheatreMember, renameTheatre, setTheatreMemberRole, switchTheatre,
    type TheatreRole,
} from '@/app/actions/theatres'

type HistoryEntry = {
    id: number
    action: 'added' | 'role_changed' | 'removed' | 'migrated'
    role: TheatreRole | null
    previousRole: TheatreRole | null
    who: string
    by: string | null
    at: string
}
export type AdminTheatre = {
    id: string
    name: string
    isDemo: boolean
    members: { userId: string; role: TheatreRole; name: string | null; email: string | null; invitedAt: string | null; invitedBy: string | null }[]
    history: HistoryEntry[]
}

// Panel superadmina: teatry, ich zespoły i przejście do teatru. Wiersze jak w Ustawieniach (.rk-setting),
// sekcje z linią (.rk-section-head), akcje rzadkie w menu „…”.
export function TheatresAdmin({ theatres, currentTheatreId, myId }: { theatres: AdminTheatre[]; currentTheatreId: string | null; myId: string }) {
    const t = useTranslations('TheatresAdmin')
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [newName, setNewName] = useState('')

    const run = (work: () => Promise<{ ok: boolean; error?: string }>, success?: string) => startTransition(async () => {
        const result = await work()
        if (!result.ok) { notify.error(result.error ?? t('failed')); return }
        if (success) notify.success(success)
        router.refresh()
    })

    const create = () => {
        const name = newName.trim()
        if (!name) return
        run(async () => {
            const result = await createTheatre(name)
            if (result.ok) setNewName('')
            return result
        }, t('created', { name }))
    }

    const goTo = (th: AdminTheatre) => startTransition(async () => {
        const result = await switchTheatre(th.id)
        if (!result.ok) { notify.error(result.error); return }
        router.push('/')
        router.refresh()
    })

    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-col gap-12 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            <header className="flex flex-col gap-1">
                <p className="rk-page-header__eyebrow">{t('eyebrow')}</p>
                <h1 className="rk-page-header__title">{t('title')}</h1>
                <p className="text-ink-muted" style={{ fontSize: 14, lineHeight: '20px' }}>{t('hint')}</p>
            </header>

            <section className="flex flex-col gap-4" aria-labelledby="ta-new">
                <div className="rk-section-head"><h2 id="ta-new">{t('newTitle')}</h2></div>
                <form className="flex gap-3" onSubmit={e => { e.preventDefault(); create() }}>
                    <input className="rk-input flex-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('newPlaceholder')} aria-label={t('newLabel')} />
                    <Button type="submit" isLoading={pending && !!newName.trim()} loadingLabel={t('saving')} disabled={!newName.trim()}>
                        <Plus />{t('create')}
                    </Button>
                </form>
            </section>

            {theatres.map(th => (
                <TheatreSection
                    key={th.id}
                    theatre={th}
                    current={th.id === currentTheatreId}
                    myId={myId}
                    pending={pending}
                    onGoTo={() => goTo(th)}
                    run={run}
                />
            ))}
        </main>
    )
}

function TheatreSection({ theatre, current, myId, pending, onGoTo, run }: {
    theatre: AdminTheatre
    current: boolean
    myId: string
    pending: boolean
    onGoTo: () => void
    run: (work: () => Promise<{ ok: boolean; error?: string }>, success?: string) => void
}) {
    const t = useTranslations('TheatresAdmin')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<TheatreRole>('member')
    const [renaming, setRenaming] = useState(false)
    const [name, setName] = useState(theatre.name)
    const [showHistory, setShowHistory] = useState(false)

    const add = () => {
        const address = email.trim()
        if (!address) return
        run(async () => {
            const result = await addTheatreMember(theatre.id, address, role)
            if (result.ok) {
                setEmail('')
                notify.success(result.data?.invited ? t('invited', { email: address }) : t('added', { email: address }))
            }
            return result
        })
    }

    const roleLabel = (r: TheatreRole) => ({ admin: t('roleAdmin'), member: t('roleMember'), viewer: t('roleViewer') })[r]
    const dateTime = (iso: string) => { const d = new Date(iso); return `${dayMonth(d)}.${d.getFullYear()}, ${time(d)}` }
    const addedLine = (by: string | null, at: string | null) =>
        by ? t('addedBy', { name: by, date: at ? dayMonth(new Date(at)) : '' }) : null
    const historyLine = (e: HistoryEntry) => {
        if (e.action === 'added') return t('evAdded', { who: e.who, role: roleLabel(e.role ?? 'member') })
        if (e.action === 'removed') return t('evRemoved', { who: e.who })
        if (e.action === 'role_changed') return t('evRole', { who: e.who, from: roleLabel(e.previousRole ?? 'member'), to: roleLabel(e.role ?? 'member') })
        return t('evMigrated', { who: e.who, role: roleLabel(e.role ?? 'member') })
    }
    const ROLES: TheatreRole[] = ['admin', 'member', 'viewer']

    return (
        <section className="flex flex-col gap-4" aria-labelledby={`ta-${theatre.id}`}>
            <div className="rk-section-head items-center">
                {renaming ? (
                    <form className="flex flex-1 gap-2" onSubmit={e => { e.preventDefault(); setRenaming(false); if (name.trim() !== theatre.name) run(() => renameTheatre(theatre.id, name)) }}>
                        <input className="rk-input flex-1" autoFocus value={name} onChange={e => setName(e.target.value)} aria-label={t('renameLabel')} onKeyDown={e => { if (e.key === 'Escape') { setName(theatre.name); setRenaming(false) } }} />
                        <Button type="submit" size="sm">{t('save')}</Button>
                    </form>
                ) : (
                    <h2 id={`ta-${theatre.id}`} className="flex items-center gap-2">
                        {theatre.name}
                        {theatre.isDemo && <span className="rk-badge rk-badge--plain">{t('demo')}</span>}
                        {current && <span className="rk-badge rk-badge--brand">{t('current')}</span>}
                    </h2>
                )}
                <div className="flex items-center gap-2">
                    <span className="rk-tally">{t('people', { count: theatre.members.length })}</span>
                    {!current && <Button variant="secondary" size="sm" onClick={onGoTo} disabled={pending}>{t('goTo')}</Button>}
                    <ActionMenu label={t('actions', { name: theatre.name })} items={[{ type: 'button', label: t('rename'), onSelect: () => setRenaming(true) }]} />
                </div>
            </div>

            {theatre.members.length === 0 && <p className="text-ink-muted" style={{ fontSize: 14, lineHeight: '20px' }}>{t('empty')}</p>}

            <div>
                {theatre.members.map(m => (
                    <div className="rk-setting" key={m.userId}>
                        <div className="rk-setting__text">
                            <b>{m.name || m.email}{m.userId === myId && ` (${t('you')})`}</b>
                            <small>{[m.name ? m.email : null, roleLabel(m.role), addedLine(m.invitedBy, m.invitedAt)].filter(Boolean).join(' · ')}</small>
                        </div>
                        <div className="rk-setting__control">
                            <ActionMenu
                                label={t('memberActions', { name: m.name || m.email || '' })}
                                items={[
                                    ...ROLES.filter(r => r !== m.role).map(r => ({
                                        type: 'button' as const,
                                        label: t('makeRole', { role: roleLabel(r) }),
                                        onSelect: () => run(() => setTheatreMemberRole(theatre.id, m.userId, r)),
                                    })),
                                    { type: 'separator' },
                                    { type: 'button', label: t('remove'), danger: true, onSelect: () => run(() => removeTheatreMember(theatre.id, m.userId), t('removed', { name: m.name || m.email || '' })) },
                                ]}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); add() }}>
                <input className="rk-input min-w-[220px] flex-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} aria-label={t('emailLabel', { name: theatre.name })} />
                <span className="rk-select" style={{ width: 200 }}>
                    <select value={role} onChange={e => setRole(e.target.value as TheatreRole)} aria-label={t('roleLabel')}>
                        <option value="member">{t('roleMember')}</option>
                        <option value="admin">{t('roleAdmin')}</option>
                        <option value="viewer">{t('roleViewer')}</option>
                    </select>
                    <ChevronDown />
                </span>
                <Button type="submit" variant="secondary" disabled={!email.trim() || pending}>{t('addPerson')}</Button>
            </form>
            <p className="rk-hint">{t('addHint')}</p>

            {theatre.history.length > 0 && (
                <div className="flex flex-col gap-3">
                    <button type="button" className="pl-link self-start" aria-expanded={showHistory} onClick={() => setShowHistory(o => !o)}>
                        {t('history')}<ChevronDown />
                    </button>
                    {showHistory && (
                        <ul className="rk-rows" aria-label={t('history')}>
                            {theatre.history.map(e => (
                                <li key={e.id}>
                                    <div className="rk-setting__text flex-1">
                                        <b>{historyLine(e)}</b>
                                        <small>{[e.by ? t('by', { name: e.by }) : t('byUnknown'), dateTime(e.at)].join(' · ')}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    )
}
