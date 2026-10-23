'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { MobileTop } from '@/components/rk/MobileTop'
import { useMotionPreference } from '@/components/rk/MotionProvider'
import { UserApprovalList } from '@/components/settings/UserApprovalList'
import { Button } from '@/components/ui/Button'
import { TheatreBanner } from '@/components/theatre/TheatreBanner'
import { applyTheme, readTheme, writeTheme, type ThemePreference } from '@/lib/theme'
import { useListPrefs, type ListDetail } from '@/lib/use-list-prefs'
import type { MotionPreference } from '@/lib/motion'

type Props = {
    userId: string
    name: string
    email: string
    roleLabel: string
    isAdmin: boolean
    canManageTeam: boolean
    theatreName: string
    theatreMeta: string
    team: { members: number; pending: number }
    aiScans: number | null
    version: string
}

const SECTIONS = ['account', 'look', 'lists', 'theatre', 'about'] as const

// Ustawienia (karta Ustawienia, ekrany „Ustawienia” i „Ustawienia-telefon”): jedna kolumna sekcji, wiersze
// .rk-setting z opisem po lewej i kontrolką po prawej; na komputerze spis sekcji po lewej.
export function SettingsView({ userId, name, email, roleLabel, isAdmin, canManageTeam, theatreName, theatreMeta, team, aiScans, version }: Props) {
    const t = useTranslations('SettingsPage')
    const router = useRouter()
    const pathname = usePathname()
    const locale = useLocale()
    const showTheatre = isAdmin || canManageTeam
    const sections = SECTIONS.filter(s => s !== 'theatre' || showTheatre)
    const [current, setCurrent] = useState<(typeof SECTIONS)[number]>('account')

    // Spis sekcji pokazuje, która jest teraz na ekranie.
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
            if (visible) setCurrent(visible.target.id.replace('set-', '') as (typeof SECTIONS)[number])
        }, { rootMargin: '-10% 0px -70% 0px' })
        sections.forEach(s => { const el = document.getElementById(`set-${s}`); if (el) observer.observe(el) })
        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTheatre])

    const supabase = createClient()

    // --- konto ---
    const [fullName, setFullName] = useState(name)
    const [editingEmail, setEditingEmail] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const saveName = async () => {
        if (fullName.trim() === name) return
        if (!fullName.trim()) { setFullName(name); notify.error(t('nameRequired')); return }
        const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', userId)
        if (error) notify.error(t('saveFailed')); else { notify.success(t('nameSaved')); router.refresh() }
    }
    const saveEmail = async () => {
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) { notify.error(t('emailInvalid')); return }
        const { error } = await supabase.auth.updateUser({ email: newEmail })
        if (error) { notify.error(t('saveFailed')); return }
        notify.success(t('emailSent', { email: newEmail }))
        setEditingEmail(false)
        setNewEmail('')
    }
    const signOut = async (scope: 'local' | 'global') => {
        await supabase.auth.signOut({ scope })
        router.push('/login')
        router.refresh()
    }

    // --- wygląd i działanie ---
    const [theme, setTheme] = useState<ThemePreference>('dark')
    useEffect(() => { setTheme(readTheme()) }, [])
    useEffect(() => {
        if (theme !== 'system') return
        const media = window.matchMedia('(prefers-color-scheme: light)')
        const onChange = () => applyTheme('system')
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [theme])
    const { preference: motion, setPreference: setMotion } = useMotionPreference()
    const changeLanguage = (next: string) => router.replace(pathname, { locale: next })

    // --- listy rekwizytów ---
    const { prefs, update } = useListPrefs()
    const savePrefs = async (patch: Parameters<typeof update>[0]) => {
        if (!(await update(patch))) notify.error(t('saveFailed'))
    }

    // --- teatr ---

    const select = (value: string, onChange: (v: string) => void, options: [string, string][], label: string) => (
        <span className="rk-select">
            <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown />
        </span>
    )

    const row = (id: string, title: string, hint: ReactNode, control: ReactNode, stack = false) => (
        <div key={id} className={`rk-setting ${stack ? 'rk-setting--stack' : 'max-md:flex-wrap'}`}>
            <div className="rk-setting__text"><b>{title}</b>{hint && <small>{hint}</small>}</div>
            <div className="rk-setting__control">{control}</div>
        </div>
    )

    const section = (id: (typeof SECTIONS)[number], title: string, children: ReactNode, tag?: ReactNode) => (
        <section id={`set-${id}`} className="scroll-mt-6" aria-labelledby={`set-h-${id}`}>
            <div className="pl-sect-head pl-sect-head--rule mb-2">
                <h2 className="pl-h2" id={`set-h-${id}`}>{title}</h2>
                {tag}
            </div>
            {children}
        </section>
    )

    const detailLabels: Record<ListDetail, string> = { all: t('detailAll'), where: t('detailWhere'), names: t('detailNames') }

    return (
        <div>
            <MobileTop back={{ href: '/', label: t('back') }} title={t('title')} anchorId="settings-title" />
            <div className="mx-auto max-w-[1184px] px-4 pt-2 pb-12 md:px-12 md:pt-8">
                <header className="mb-6 md:mb-8">
                    <p className="rk-page-header__eyebrow hidden md:block">{[fullName || email, roleLabel].filter(Boolean).join(' · ')}</p>
                    <h1 className="rk-page-header__title" id="settings-title">{t('title')}</h1>
                </header>

                <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
                    <nav className="hidden md:block" aria-label={t('sections')}>
                        <ul className="rk-settings-nav sticky top-8">
                            {sections.map(s => (
                                <li key={s}><a href={`#set-${s}`} aria-current={current === s ? 'true' : undefined}>{t(`nav_${s}`)}</a></li>
                            ))}
                        </ul>
                    </nav>

                    <div className="flex max-w-[712px] flex-col gap-12">
                        {section('account', t('nav_account'), <>
                            {row('name', t('name'), t('nameHint'),
                                <input className="rk-input !w-[240px] max-md:!w-full" value={fullName} onChange={e => setFullName(e.target.value)} onBlur={saveName}
                                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} aria-label={t('name')} />, true)}
                            {row('email', t('email'), editingEmail ? t('emailPending') : `${email} · ${t('emailHint')}`,
                                editingEmail ? (
                                    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void saveEmail() }}>
                                        <input className="rk-input !w-[220px]" type="email" autoFocus value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={t('emailNew')} aria-label={t('emailNew')} />
                                        <Button type="submit" size="sm">{t('save')}</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingEmail(false)}>{t('cancel')}</Button>
                                    </form>
                                ) : <Button variant="secondary" size="sm" onClick={() => setEditingEmail(true)}>{t('change')}</Button>)}
                            {row('password', t('password'), t('passwordHint'),
                                <Link className="rk-btn rk-btn--secondary rk-btn--sm" href="/settings/password">{t('changePassword')}</Link>)}
                            {row('devices', t('devices'), t('devicesHint'),
                                <Button variant="ghost" size="sm" onClick={() => signOut('global')}>{t('signOutEverywhere')}</Button>)}
                        </>)}

                        {section('look', t('nav_look'), <>
                            {row('theme', t('theme'), t('themeHint'),
                                select(theme, v => { const next = v as ThemePreference; setTheme(next); writeTheme(next) },
                                    [['dark', t('themeDark')], ['light', t('themeLight')], ['system', t('themeSystem')]], t('theme')))}
                            {row('motion', t('motion'), t('motionHint'),
                                select(motion, v => setMotion(v as MotionPreference),
                                    [['auto', t('motionAuto')], ['full', t('motionFull')], ['lite', t('motionLite')]], t('motion')))}
                            {row('language', t('language'), null,
                                select(locale, changeLanguage, [['pl', 'Polski'], ['en', 'English']], t('language')))}
                        </>)}

                        {section('lists', t('nav_lists'), <>
                            {row('detail', t('detail'), t('detailHint'),
                                <div className="rk-tabs" role="tablist" aria-label={t('detail')}>
                                    {(['all', 'where', 'names'] as const).map(d => (
                                        <button key={d} className="rk-tab" role="tab" aria-selected={prefs.detail === d} onClick={() => savePrefs({ detail: d })}>{detailLabels[d]}</button>
                                    ))}
                                </div>, true)}
                            {row('acts', t('acts'), t('actsHint'),
                                select(prefs.actsCollapsed ? 'collapsed' : 'expanded', v => savePrefs({ actsCollapsed: v === 'collapsed' }),
                                    [['expanded', t('actsExpanded')], ['collapsed', t('actsCollapsed')]], t('acts')))}
                            {row('done', t('collapseDone'), t('collapseDoneHint'),
                                <label className="rk-switch">
                                    <input type="checkbox" role="switch" checked={prefs.collapseDone} onChange={e => savePrefs({ collapseDone: e.target.checked })} aria-label={t('collapseDone')} />
                                    <span className="rk-track" />
                                </label>)}
                        </>)}

                        {showTheatre && section('theatre', t('nav_theatre'), <>
                            {/* Nazwę teatru zmienia tylko administrator aplikacji, w Ustawieniach → Teatry. */}
                            {theatreName && <div className="pb-2"><TheatreBanner name={theatreName} meta={theatreMeta} /></div>}
                            {row('theatreName', t('theatreName'), null,
                                <span className="text-ink" style={{ fontSize: 14, lineHeight: '20px' }}>{theatreName || t('theatreNone')}</span>)}
                            {row('team', t('team'), t('teamHint', { members: team.members, pending: team.pending }),
                                <Link className="rk-btn rk-btn--secondary rk-btn--sm" href="/settings/team">{t('manage')}</Link>)}
                            {isAdmin && row('allTheatres', t('allTheatres'), t('allTheatresHint'),
                                <Link className="rk-btn rk-btn--secondary rk-btn--sm" href="/settings/theatres">{t('manage')}</Link>)}
                            {isAdmin && aiScans !== null && row('ai', t('ai'), t('aiHint', { count: aiScans }),
                                <Link className="pl-link" href="/ai-stats">{t('details')}<ChevronRight /></Link>)}
                            {isAdmin && <div id="set-team-list" className="scroll-mt-6 pt-2"><UserApprovalList /></div>}
                        </>, isAdmin ? <span className="rk-badge rk-badge--plain">{t('adminTag')}</span> : undefined)}

                        {section('about', t('nav_about'), <>
                            {row('trash', t('trash'), t('trashHint'), <Link className="pl-link" href="/trash">{t('open')}<ChevronRight /></Link>)}
                            {row('version', t('version'), `${version} · ${t('testVersion')}`, null)}
                            {row('privacy', t('privacy'), t('privacyHint'), <Link className="pl-link" href="/privacy">{t('open')}<ChevronRight /></Link>)}
                            {row('terms', t('terms'), null, <Link className="pl-link" href="/terms">{t('open')}<ChevronRight /></Link>)}
                        </>)}

                        <div><Button variant="secondary" onClick={() => signOut('local')}>{t('signOut')}</Button></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

