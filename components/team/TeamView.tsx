'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronLeft, KeyRound, RotateCw, Trash2, UserCog, UserPlus, Undo2 } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { notify } from '@/utils/notify'
import { MobileTop } from '@/components/rk/MobileTop'
import { EmptyState } from '@/components/rk/EmptyState'
import { ActionMenu, type ActionMenuItem } from '@/components/rk/ActionMenu'
import { Button } from '@/components/ui/Button'
import { InviteDialog, LastManagerDialog, RemoveDialog, RoleDialog, ROLES } from '@/components/team/TeamDialogs'
import { daysAgo, eventStamp, initialsColor, initialsOf } from '@/components/team/team-utils'
import { removeFromTeam, resendInvite, revokeInvite, sendPasswordReset, setMemberRole } from '@/app/actions/team'
import type { TeamData, TeamPerson, TheatreRole } from '@/lib/team'

type Tab = 'all' | 'pending' | 'history'
type Dialog =
    | { kind: 'invite' }
    | { kind: 'role'; person: TeamPerson }
    | { kind: 'remove'; person: TeamPerson }
    | { kind: 'last'; why: 'remove' | 'role' }

const ROLE_KEY = { admin: 'roleAdmin', member: 'roleMember', viewer: 'roleViewer' } as const
const LAST_MANAGER = 'co najmniej jednego kierownika'

const displayName = (p: TeamPerson) => p.fullName?.trim() || p.email

// Ekran zespołu (plansze „Zespół”, „Zespół-telefon”, „Zespół-akcje”). Kierownik ma akcje i historię;
// rekwizytor i podgląd widzą tę samą listę bez nich (stan 10).
export function TeamView({ data }: { data: TeamData }) {
    const t = useTranslations('Team')
    const router = useRouter()
    const { people, events, me, theatreName } = data
    const canManage = me.canManage
    const [tab, setTab] = useState<Tab>('all')
    const [dialog, setDialog] = useState<Dialog | null>(null)
    const [, startTransition] = useTransition()

    const joined = people.filter(p => !p.pending)
    const pendingList = people.filter(p => p.pending)
    const adminCount = people.filter(p => p.role === 'admin').length
    const visible = !canManage ? joined : tab === 'pending' ? pendingList : people
    const alone = canManage && people.length === 1 && people[0].isMe

    const refresh = () => startTransition(() => router.refresh())
    const roleName = (r: TheatreRole) => t(ROLE_KEY[r])
    const isLastManager = (p: TeamPerson) => p.role === 'admin' && adminCount <= 1

    // --- akcje ---
    const guard = (message: string, why: 'remove' | 'role') => {
        if (message.includes(LAST_MANAGER)) { setDialog({ kind: 'last', why }); return true }
        return false
    }

    const changeRole = async (p: TeamPerson, role: TheatreRole) => {
        if (role === p.role) return
        if (isLastManager(p) && role !== 'admin') { setDialog({ kind: 'last', why: 'role' }); return }
        const res = await setMemberRole(p.userId, role)
        setDialog(null)
        if (!res.ok) { if (!guard(res.error, 'role')) notify.error(res.error); return }
        const previous = res.data?.previous ?? p.role
        notify.undo(t('roleChanged', { name: displayName(p), role: roleName(role) }), t('undo'), async () => {
            const back = await setMemberRole(p.userId, previous)
            if (!back.ok) notify.error(back.error)
            refresh()
        })
        refresh()
    }

    const remove = async (p: TeamPerson) => {
        const res = await removeFromTeam(p.userId)
        if (!res.ok) {
            setDialog(null)
            if (!guard(res.error, 'remove')) notify.error(res.error)
            return
        }
        setDialog(null)
        notify.success(t('removedToast', { name: displayName(p) }))
        refresh()
    }

    const resend = async (p: TeamPerson) => {
        const res = await resendInvite(p.userId)
        if (!res.ok) { notify.error(res.error); return }
        notify.info(t('resent', { email: p.email }))
        refresh()
    }

    const revoke = async (p: TeamPerson) => {
        const res = await revokeInvite(p.userId)
        if (!res.ok) { notify.error(res.error); return }
        notify.success(t('revoked', { email: p.email }))
        refresh()
    }

    const reset = async (p: TeamPerson) => {
        const res = await sendPasswordReset(p.userId)
        if (!res.ok) { notify.error(res.error); return }
        notify.success(t('resetSent', { email: p.email }))
    }

    const menuFor = (p: TeamPerson): ActionMenuItem[] => p.pending
        ? [
            { type: 'button', label: t('menuResend'), icon: <RotateCw />, onSelect: () => resend(p) },
            { type: 'button', label: t('menuChangeRole'), icon: <UserCog />, onSelect: () => setDialog({ kind: 'role', person: p }) },
            { type: 'separator' },
            { type: 'button', label: t('menuRevoke'), icon: <Undo2 />, danger: true, onSelect: () => revoke(p) },
        ]
        : [
            { type: 'button', label: t('menuChangeRole'), icon: <UserCog />, onSelect: () => setDialog({ kind: 'role', person: p }) },
            { type: 'button', label: t('menuReset'), icon: <KeyRound />, onSelect: () => reset(p) },
            { type: 'separator' },
            { type: 'button', label: t('menuRemove'), icon: <Trash2 />, danger: true, onSelect: () => (isLastManager(p) ? setDialog({ kind: 'last', why: 'remove' }) : setDialog({ kind: 'remove', person: p })) },
        ]

    // --- fragmenty wierszy ---
    const initials = (p: TeamPerson, sm = false) => (
        <span
            className={`np-ini ${sm ? 'np-ini--sm' : ''} ${p.pending && !p.fullName ? 'np-ini--dash' : ''}`}
            style={{ '--ini': initialsColor(p.userId) } as React.CSSProperties}
            aria-hidden="true"
        >
            {p.pending && !p.fullName ? '?' : initialsOf(p.fullName, p.email)}
        </span>
    )

    const seen = (p: TeamPerson) => {
        if (p.pending) {
            if (!p.invitedAt) return t('sentUnknown')
            const d = daysAgo(p.invitedAt)
            return d === 0 ? t('sentToday') : d === 1 ? t('sentYesterday') : t('sentDays', { count: d })
        }
        if (!p.lastSignInAt) return t('seenNever')
        const d = daysAgo(p.lastSignInAt)
        if (d === 0) return t('seenToday')
        if (d === 1) return t('seenYesterday')
        if (d < 7) return t('seenDays', { count: d })
        if (d < 14) return t('seenWeek')
        if (d < 30) return t('seenWeeks', { count: Math.floor(d / 7) })
        return t('seenMonth')
    }

    const isFresh = (p: TeamPerson) => !p.pending && !!p.lastSignInAt && daysAgo(p.lastSignInAt) <= 1

    const roleBadge = (r: TheatreRole, short = false) => (
        <span className={`rk-badge ${r === 'admin' ? 'rk-badge--brand' : 'rk-badge--plain'}`}>
            {r === 'admin' && short ? t('roleAdminShort') : roleName(r)}
        </span>
    )

    const roleSelect = (p: TeamPerson) => (
        <div className="rk-select">
            <select
                aria-label={`${t('roleField')}: ${displayName(p)}`}
                value={p.role}
                disabled={p.isMe}
                onChange={e => changeRole(p, e.target.value as TheatreRole)}
            >
                {ROLES.map(r => <option key={r} value={r}>{roleName(r)}</option>)}
            </select>
            <ChevronDown />
        </div>
    )

    const menu = (p: TeamPerson) => (p.isMe ? <span /> : <ActionMenu label={t('actionsFor', { name: displayName(p) })} items={menuFor(p)} />)

    const nameCell = (p: TeamPerson) => (
        <div className="zp-pers">
            {initials(p)}
            <div style={{ minWidth: 0 }}>
                <b>{displayName(p)}{p.isMe && <span className="you">{t('you')}</span>}</b>
                <small>{p.pending ? (p.fullName ? p.email : t('pendingRole', { role: roleName(p.role) })) : p.email}</small>
            </div>
        </div>
    )

    const desktopRow = (p: TeamPerson) => (
        <div key={p.userId} className={`zp-row ${p.pending ? 'zp-row--pend' : ''}`}>
            {nameCell(p)}
            {roleSelect(p)}
            <span className="zp-state">
                {p.pending ? (
                    <>
                        <span className="rk-badge rk-badge--warning">{seen(p)}</span>
                        <button type="button" className="rk-btn rk-btn--ghost rk-btn--sm" style={{ paddingInline: 8 }} onClick={() => resend(p)}>{t('resend')}</button>
                    </>
                ) : (
                    <>
                        <span className="rk-dot" style={{ background: isFresh(p) ? 'var(--success)' : 'var(--border-strong)' }} aria-hidden="true" />
                        {seen(p)}
                    </>
                )}
            </span>
            {menu(p)}
        </div>
    )

    const phoneRow = (p: TeamPerson) => (
        <div key={p.userId} className="zp-prow">
            {initials(p)}
            <div className="m">
                <b>{displayName(p)}{p.isMe && ` · ${t('you')}`}</b>
                <small>{p.pending ? t('pendingPhone', { role: roleName(p.role) }) : p.email}</small>
            </div>
            {!p.pending && roleBadge(p.role, true)}
            {!p.isMe && <ActionMenu label={t('actionsFor', { name: displayName(p) })} items={menuFor(p)} />}
        </div>
    )

    // Stan 10: lista bez akcji.
    const readOnlyRow = (p: TeamPerson) => (
        <div key={p.userId} className="zp-mrow">
            {initials(p, true)}
            <div className="m">
                <b>{displayName(p)}{p.isMe && ` · ${t('you')}`}</b>
                <small>{p.email}</small>
            </div>
            {roleBadge(p.role)}
        </div>
    )

    // --- nagłówek ---
    const invite = () => setDialog({ kind: 'invite' })
    const description = [
        t('headCount', { count: joined.length }),
        ...(canManage && pendingList.length > 0 ? [t('headPending', { count: pendingList.length })] : []),
    ].join(' · ')

    const tabs: [Tab, string, number | null][] = [
        ['all', t('tabAll'), people.length],
        ['pending', t('tabPending'), pendingList.length],
        ['history', t('tabHistory'), null],
    ]

    const list = () => {
        if (!canManage) {
            return <div className="zp-list" aria-label={t('memberList')}>{visible.map(readOnlyRow)}</div>
        }
        if (tab === 'history') {
            return events.length === 0
                ? <p className="rk-hint py-4">{t('historyEmpty')}</p>
                : (
                    <ol className="zp-hist" aria-label={t('history')}>
                        {events.map((e, i) => (
                            <li key={i}>
                                <time dateTime={e.at}>{eventStamp(e.at)}</time>
                                <span className="np-ini np-ini--sm" style={{ '--ini': initialsColor(e.actorName ?? 'system') } as React.CSSProperties} aria-hidden="true">
                                    {initialsOf(e.actorName, '?')}
                                </span>
                                <span>{e.text}</span>
                            </li>
                        ))}
                    </ol>
                )
        }
        if (alone && tab === 'all') {
            return (
                <EmptyState title={t('emptyTitle')} actions={<Button leftIcon={<UserPlus />} onClick={invite}>{t('emptyAction')}</Button>}>
                    {t('emptyText')}
                </EmptyState>
            )
        }
        if (visible.length === 0) return <p className="rk-hint py-4">{t('noPending')}</p>
        return (
            <>
                <div className="hidden md:block">
                    <div className="zp-cols"><span>{t('colPerson')}</span><span>{t('colRole')}</span><span>{t('colState')}</span><span /></div>
                    {visible.map(desktopRow)}
                </div>
                <div className="md:hidden">{visible.map(phoneRow)}</div>
            </>
        )
    }

    return (
        <div>
            <MobileTop
                back={{ href: '/settings', label: t('back') }}
                title={t('title')}
                anchorId="team-title"
                actions={canManage ? <Button size="sm" leftIcon={<UserPlus />} onClick={invite}>{t('inviteShort')}</Button> : undefined}
            />
            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-12 md:gap-8 md:px-12 md:pt-8">
                <Link href="/settings" className="zp-back hidden md:inline-flex"><ChevronLeft />{t('back')}</Link>
                <header className="zp-head">
                    <div>
                        <span className="rk-tally">{theatreName}</span>
                        <h1 id="team-title">{t('title')}</h1>
                        <p className="hidden md:block">{description}</p>
                    </div>
                    {canManage && <Button className="max-md:hidden" leftIcon={<UserPlus />} onClick={invite}>{t('invite')}</Button>}
                </header>

                <div className="zp-grid max-md:!block">
                    <div className="zp-list">
                        {canManage && (
                            <div className="rk-tabs zp-tabs" role="tablist" aria-label={t('tabs')} style={{ alignSelf: 'flex-start' }}>
                                {tabs.filter(([id]) => id !== 'history' || canManage).map(([id, label, count]) => (
                                    <button key={id} type="button" role="tab" className="rk-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                                        {label}{count !== null && ` ${count}`}
                                    </button>
                                ))}
                            </div>
                        )}
                        {list()}
                    </div>

                    <aside className="zp-side max-md:hidden">
                        <section>
                            <h3>{t('sideRoles')}</h3>
                            <dl>
                                <div><dt>{t('roleAdmin')}</dt><dd>{t('sideRoleAdmin')}</dd></div>
                                <div><dt>{t('roleMember')}</dt><dd>{t('sideRoleMember')}</dd></div>
                                <div><dt>{t('roleViewer')}</dt><dd>{t('sideRoleViewer')}</dd></div>
                            </dl>
                        </section>
                        <section><h3>{t('sideRules')}</h3><p>{t('sideRulesText')}</p></section>
                        {canManage && <section><h3>{t('sideInvites')}</h3><p>{t('sideInvitesText')}</p></section>}
                    </aside>
                </div>
            </div>

            {dialog?.kind === 'invite' && (
                <InviteDialog
                    theatreName={theatreName}
                    onClose={() => setDialog(null)}
                    onDone={({ email, invited }) => {
                        setDialog(null)
                        notify.success(invited ? t('invited', { email }) : t('addedExisting', { email }))
                        refresh()
                    }}
                />
            )}
            {dialog?.kind === 'role' && (
                <RoleDialog name={displayName(dialog.person)} current={dialog.person.role} onClose={() => setDialog(null)} onSave={role => changeRole(dialog.person, role)} />
            )}
            {dialog?.kind === 'remove' && (
                <RemoveDialog name={displayName(dialog.person)} theatreName={theatreName} onClose={() => setDialog(null)} onConfirm={() => remove(dialog.person)} />
            )}
            {dialog?.kind === 'last' && (
                <LastManagerDialog kind={dialog.why} onClose={() => setDialog(null)} onGoTeam={() => { setDialog(null); setTab('all') }} />
            )}
        </div>
    )
}
