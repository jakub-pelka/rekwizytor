'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronLeft, Eye, KeyRound, Mail, RotateCw, Trash2, UserCog, UserPlus, Undo2 } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { notify } from '@/utils/notify'
import { MobileTop } from '@/components/rk/MobileTop'
import { EmptyState } from '@/components/rk/EmptyState'
import { ActionMenu, type ActionMenuItem } from '@/components/rk/ActionMenu'
import { Button } from '@/components/ui/Button'
import { CodeDialog, ExistingAccountDialog, InviteDialog, LastManagerDialog, NewCodeDialog, RemoveDialog, RoleDialog, ROLES, copyInviteCode } from '@/components/team/TeamDialogs'
import { dateShort, daysAgo, eventStamp, initialsColor, initialsOf, timeOf } from '@/components/team/team-utils'
import { regenerateInviteCode, removeFromTeam, resendInvite, revokeInvite, sendPasswordReset, setMemberRole, showInviteCode } from '@/app/actions/team'
import type { TeamData, TeamPerson, TheatreRole } from '@/lib/team'

type Tab = 'all' | 'pending' | 'history'
type Dialog =
    | { kind: 'invite' }
    | { kind: 'role'; person: TeamPerson }
    | { kind: 'remove'; person: TeamPerson }
    | { kind: 'last'; why: 'remove' | 'role' }
    | { kind: 'code'; mode: 'sent' | 'show'; person: TeamPerson | null; who: string; roleLabel: string; code: string; expiresAt: string; sentAt: string | null }
    | { kind: 'existing'; email: string }
    | { kind: 'newCode'; person: TeamPerson }

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

    // Zaproszona osoba dołącza w innej karcie albo na innym urządzeniu, więc lista sama się odświeża: gdy wracasz na kartę
    // i co 15 s, dopóki ktoś czeka na przyjęcie zaproszenia (bez tego kierownik musiał odświeżać stronę ręcznie).
    const hasPending = pendingList.length > 0
    useEffect(() => {
        const refreshIfVisible = () => { if (document.visibilityState === 'visible') startTransition(() => router.refresh()) }
        document.addEventListener('visibilitychange', refreshIfVisible)
        window.addEventListener('focus', refreshIfVisible)
        const timer = hasPending ? setInterval(refreshIfVisible, 15000) : null
        return () => {
            document.removeEventListener('visibilitychange', refreshIfVisible)
            window.removeEventListener('focus', refreshIfVisible)
            if (timer) clearInterval(timer)
        }
    }, [hasPending, router])
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
        if (!res.ok) { if (!guard(res.error, 'role')) notify.error(res.error); refresh(); return }
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
        if (!res.ok) { notify.error(res.error); refresh(); return }
        notify.info(t('resent', { email: p.email }))
        refresh()
    }

    const revoke = async (p: TeamPerson) => {
        const res = await revokeInvite(p.userId)
        if (!res.ok) { notify.error(res.error); refresh(); return }
        notify.success(t('revokedCode', { email: p.email }))
        refresh()
    }

    // --- kody zaproszeń ---
    const showCode = async (p: TeamPerson) => {
        const res = await showInviteCode(p.userId)
        if (!res.ok || !res.data) { notify.error(res.ok ? t('failed') : res.error); refresh(); return }
        setDialog({ kind: 'code', mode: 'show', person: p, who: displayName(p), roleLabel: roleName(p.role), ...res.data })
    }

    const newCode = async (p: TeamPerson) => {
        const res = await regenerateInviteCode(p.userId)
        setDialog(null)
        if (!res.ok || !res.data) { notify.error(res.ok ? t('failed') : res.error); refresh(); return }
        const { code } = res.data
        // Nowy kod w toaście z „Kopiuj”: kierownik zwykle klika go od razu przy osobie. Gdyby toast zniknął, kod wróci w „Pokaż kod”.
        notify.undo(t('newCodeToast', { email: p.email, code }), t('newCodeCopy'), async () => {
            if (await copyInviteCode(code)) notify.success(t('codeCopiedToast', { email: p.email }))
            else notify.error(t('codeCopyFailed'))
        })
        refresh()
    }

    const reset = async (p: TeamPerson) => {
        const res = await sendPasswordReset(p.userId)
        if (!res.ok) { notify.error(res.error); refresh(); return }
        notify.success(t('resetSent', { email: p.email }))
    }

    const menuFor = (p: TeamPerson, codeOnRow = false): ActionMenuItem[] => p.pending
        ? [
            // Na komputerze „Pokaż kod” i „Nowy kod” są już na wierszu, w menu zostaje reszta.
            ...(!codeOnRow && p.invite?.state === 'waiting' ? [{ type: 'button' as const, label: t('showCode'), icon: <Eye />, onSelect: () => showCode(p) }] : []),
            ...(!codeOnRow ? [{ type: 'button' as const, label: t('newCodeMenu'), icon: <RotateCw />, onSelect: () => setDialog({ kind: 'newCode', person: p }) }] : []),
            { type: 'button', label: t('menuChangeRole'), icon: <UserCog />, onSelect: () => setDialog({ kind: 'role', person: p }) },
            { type: 'button', label: t('menuResend'), icon: <Mail />, onSelect: () => resend(p) },
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
        if (!p.lastSignInAt) return t('seenNever')
        const d = daysAgo(p.lastSignInAt)
        if (d === 0) return t('seenToday')
        if (d === 1) return t('seenYesterday')
        if (d < 7) return t('seenDays', { count: d })
        if (d < 14) return t('seenWeek')
        if (d < 30) return t('seenWeeks', { count: Math.floor(d / 7) })
        return t('seenMonth')
    }

    const sentAgo = (p: TeamPerson) => {
        if (!p.invitedAt) return t('sentAgoUnknown')
        const d = daysAgo(p.invitedAt)
        return d === 0 ? t('sentAgoToday') : d === 1 ? t('sentAgoYesterday') : t('sentAgoDays', { count: d })
    }

    // Stan zaproszenia przy wierszu: odznaka i krótka notka (plansze „Zespół-oczekujące”).
    const inviteBadge = (p: TeamPerson) => {
        const st = p.invite?.state
        if (st === 'waiting') return <span className="rk-badge rk-badge--warning">{t('stateWaiting')}</span>
        if (st === 'locked') return <span className="rk-badge rk-badge--danger">{t('stateLocked')}</span>
        if (st === 'expired') return <span className="rk-badge rk-badge--plain">{t('stateExpired')}</span>
        return <span className="rk-badge rk-badge--plain">{t('stateNone')}</span>
    }
    const inviteNote = (p: TeamPerson) => {
        const inv = p.invite
        if (!inv) return sentAgo(p)
        if (inv.state === 'waiting') return t('waitingNote', { date: dateShort(inv.expiresAt), sent: sentAgo(p) })
        if (inv.state === 'locked') {
            if (!inv.lockedAt) return t('lockedNoteShort', { count: 5 })
            const d = daysAgo(inv.lockedAt)
            const time = timeOf(inv.lockedAt)
            const when = d === 0 ? t('lockedToday', { time }) : d === 1 ? t('lockedYesterday', { time }) : t('lockedOn', { date: dateShort(inv.lockedAt), time })
            return t('lockedNote', { count: 5, when })
        }
        return t('expiredNote', { date: dateShort(inv.expiresAt), sent: sentAgo(p) })
    }
    const phoneNote = (p: TeamPerson) => {
        const inv = p.invite
        const role = roleName(p.role)
        if (!inv) return t('pendingPhone', { role })
        if (inv.state === 'waiting') return t('phoneWaiting', { role, date: dateShort(inv.expiresAt) })
        if (inv.state === 'locked') return t('phoneLocked', { role, count: 5 })
        return t('phoneExpired', { role, date: dateShort(inv.expiresAt) })
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

    const menu = (p: TeamPerson, codeOnRow = false) => (p.isMe ? <span /> : <ActionMenu label={t('actionsFor', { name: displayName(p) })} items={menuFor(p, codeOnRow)} />)

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
                        {inviteBadge(p)}
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

    // Zakładka „Oczekujące” (plansza „Zespół-oczekujące”): stan, notka i dwie akcje na wierzchu, reszta w menu.
    const pendingRow = (p: TeamPerson) => {
        const st = p.invite?.state
        return (
            <div key={p.userId} className="kd-prow">
                {nameCell(p)}
                {roleSelect(p)}
                <div className="kd-st">{inviteBadge(p)}<small>{inviteNote(p)}</small></div>
                <div className="kd-act">
                    {st === 'waiting' && <button type="button" className="rk-btn rk-btn--ghost rk-btn--sm" onClick={() => showCode(p)}>{t('showCode')}</button>}
                    <button type="button" className="rk-btn rk-btn--secondary rk-btn--sm" onClick={() => setDialog({ kind: 'newCode', person: p })}>{t('newCode')}</button>
                    {menu(p, true)}
                </div>
            </div>
        )
    }

    const phoneRow = (p: TeamPerson) => (
        <div key={p.userId} className="zp-prow">
            {initials(p)}
            <div className="m">
                <b>{displayName(p)}{p.isMe && ` · ${t('you')}`}</b>
                <small>{p.pending ? phoneNote(p) : p.email}</small>
            </div>
            {p.pending ? inviteBadge(p) : roleBadge(p.role, true)}
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
                    {tab === 'pending' ? (
                        <div className="kd-pend">
                            <div className="kd-pcols"><span>{t('colPersonInvited')}</span><span>{t('colRole')}</span><span>{t('colState')}</span><span /></div>
                            {visible.map(pendingRow)}
                        </div>
                    ) : (
                        <>
                            <div className="zp-cols"><span>{t('colPerson')}</span><span>{t('colRole')}</span><span>{t('colState')}</span><span /></div>
                            {visible.map(desktopRow)}
                        </>
                    )}
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
                    onDone={({ email, role, invited, code, expiresAt }) => {
                        // Kod nie wraca w mailu, więc okno zostaje, dopóki kierownik nie kliknie „Gotowe”.
                        if (invited && code && expiresAt) setDialog({ kind: 'code', mode: 'sent', person: null, who: email, roleLabel: roleName(role), code, expiresAt, sentAt: null })
                        else if (invited) { setDialog(null); notify.success(t('invited', { email })) }
                        else setDialog({ kind: 'existing', email })
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
            {dialog?.kind === 'code' && (
                <CodeDialog
                    mode={dialog.mode}
                    who={dialog.who}
                    roleLabel={dialog.roleLabel}
                    code={dialog.code}
                    expiresAt={dialog.expiresAt}
                    sentAt={dialog.sentAt}
                    onClose={() => setDialog(null)}
                    onNewCode={dialog.person ? () => setDialog({ kind: 'newCode', person: dialog.person! }) : undefined}
                />
            )}
            {dialog?.kind === 'existing' && (
                <ExistingAccountDialog email={dialog.email} theatreName={theatreName} onClose={() => setDialog(null)} onGoTeam={() => { setDialog(null); setTab('all') }} />
            )}
            {dialog?.kind === 'newCode' && (
                <NewCodeDialog name={displayName(dialog.person)} onClose={() => setDialog(null)} onConfirm={() => newCode(dialog.person)} />
            )}
            {dialog?.kind === 'last' && (
                <LastManagerDialog kind={dialog.why} onClose={() => setDialog(null)} onGoTeam={() => { setDialog(null); setTab('all') }} />
            )}
        </div>
    )
}
