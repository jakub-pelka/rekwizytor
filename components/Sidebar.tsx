'use client'

import { Link, useRouter } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Calendar, Check, Command, QrCode, Warehouse, LogIn, LogOut, NotebookPen, PanelLeftClose, PanelLeftOpen, Settings2, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider'
import { RkIcon } from '@/components/rk/RkIcon'
import { RkAvatar, avatarFor } from '@/components/rk/RkAvatar'
import { theatreNowNaive } from '@/lib/rk-format'
import { switchTheatre } from '@/app/actions/theatres'
import { notify } from '@/utils/notify'

type Counts = { weekShows: number; todayLists: number; mentions: number }
type Profile = { id: string; name: string; role: string | null }
type Theatre = { id: string; name: string }

const STORAGE_KEY = 'rk-sidebar-rail'

// Menu boczne na komputerze (karta Sidebar, .rk-sidebar): 256 px albo pasek ikon 64 px.
export function Sidebar() {
    const pathname = usePathname().replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/'
    const router = useRouter()
    const t = useTranslations('Navigation')
    const { openSearch } = useGlobalSearch()
    const [rail, setRail] = useState(false)
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
    const [counts, setCounts] = useState<Counts>({ weekShows: 0, todayLists: 0, mentions: 0 })
    const [menuOpen, setMenuOpen] = useState(false)
    // Teatry, do których ta osoba ma dostęp, i bieżący. Przełącznik tylko przy więcej niż jednym (POMYSLY 11).
    const [theatres, setTheatres] = useState<Theatre[]>([])
    const [currentTheatre, setCurrentTheatre] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Zwinięcie pamiętamy na urządzeniu; szerokość czyta AppShell przez zmienną CSS.
    useEffect(() => {
        try { setRail(localStorage.getItem(STORAGE_KEY) === '1') } catch { /* tryb prywatny */ }
    }, [])
    useEffect(() => {
        document.documentElement.style.setProperty('--rk-sidebar-w', rail ? '64px' : '256px')
        try { localStorage.setItem(STORAGE_KEY, rail ? '1' : '0') } catch { /* tryb prywatny */ }
    }, [rail])

    useEffect(() => {
        const supabase = createClient()
        const today = theatreNowNaive().slice(0, 10)
        const weekEnd = new Date(new Date(today).getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
                setProfile({ id: user.id, name: data?.full_name || user.email?.split('@')[0] || '', role: data?.role ?? null })
                // Superadmin widzi wszystkie teatry, pozostali swoje. Błąd (baza przed migracją teatrów) = brak przełącznika.
                const [list, active] = await Promise.all([
                    data?.role === 'admin'
                        ? supabase.from('theatres').select('id, name').order('name')
                        : supabase.from('theatre_members').select('theatres(id, name)').eq('user_id', user.id),
                    supabase.rpc('active_theatre_id'),
                ])
                if (!list.error) {
                    const rows = (list.data ?? []) as ({ id: string; name: string } | { theatres: Theatre | null })[]
                    setTheatres(rows.map(r => ('theatres' in r ? r.theatres : r)).filter((x): x is Theatre => !!x))
                }
                if (!active.error) setCurrentTheatre(active.data as string | null)
            } else {
                setProfile(null)
            }
            const [week, todayLists, mentions] = await Promise.all([
                supabase.from('show_lists').select('id', { count: 'exact', head: true }).eq('kind', 'show').gte('show_date', today).lt('show_date', weekEnd),
                supabase.from('show_lists').select('id', { count: 'exact', head: true }).gte('show_date', today).lt('show_date', `${today}T23:59:59`),
                user
                    ? supabase.from('note_mentions').select('id', { count: 'exact', head: true }).eq('mentioned_id', user.id)
                        .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
                    : Promise.resolve({ count: 0 }),
            ])
            setCounts({ weekShows: week.count ?? 0, todayLists: todayLists.count ?? 0, mentions: mentions.count ?? 0 })
        })()
    }, [])

    useEffect(() => {
        if (!menuOpen) return
        const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
    }, [menuOpen])

    const pickTheatre = async (id: string) => {
        setMenuOpen(false)
        if (id === currentTheatre) return
        const result = await switchTheatre(id)
        if (!result.ok) { notify.error(result.error); return }
        setCurrentTheatre(id)
        router.push('/')
        router.refresh()
    }

    const signOut = async () => {
        await createClient().auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const isActive = (href: string, also: string[] = []) =>
        href === '/' ? pathname === '/' : [href, ...also].some(h => pathname === h || pathname.startsWith(`${h}/`))

    const item = (href: string, label: string, icon: ReactNode, n?: { value: number; tone?: 'new' | 'live' }, also?: string[], exact?: boolean) => {
        const active = exact ? pathname === href : isActive(href, also)
        return (
            <Link key={href} className="rk-nav-item" href={href} aria-current={active ? 'page' : undefined} title={rail ? label : undefined}>
                {icon}
                {!rail && <span className="flex-1 truncate">{label}</span>}
                {n && n.value > 0 && (
                    <span className={`rk-nav-item__n ${n.tone ? `rk-nav-item__n--${n.tone}` : ''}`}>{n.value > 99 ? '99+' : n.value}</span>
                )}
            </Link>
        )
    }

    const ROLE: Record<string, string> = { admin: t('roleAdmin'), manager: t('roleManager'), user: t('roleUser') }

    return (
        <aside
            className={`rk-sidebar ${rail ? 'rk-sidebar--rail' : ''} fixed inset-y-0 left-0 z-40 hidden rounded-none border-y-0 border-l-0 md:flex`}
            aria-label={t('mainNavigation')}
        >
            <div className="rk-sidebar__top" style={rail ? { alignItems: 'center', paddingLeft: 8, paddingRight: 8 } : undefined}>
                <div className="rk-sidebar__brand" style={rail ? { flexDirection: 'column', gap: 16, padding: 0 } : undefined}>
                    <Link href="/" aria-label="Rekwizytor">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={rail ? '/brand/rekwizytor-znak.svg' : '/brand/rekwizytor-logo-dark.svg'} alt="" style={rail ? { height: 32 } : undefined} />
                    </Link>
                    <button
                        type="button"
                        className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm"
                        onClick={() => setRail(r => !r)}
                        aria-label={rail ? t('expand') : t('collapse')}
                    >
                        {rail ? <PanelLeftOpen /> : <PanelLeftClose />}
                    </button>
                </div>
                <button type="button" className="rk-sidebar__search" onClick={() => openSearch()} title={rail ? t('goTo') : undefined}>
                    <Command />
                    {!rail && <><span>{t('goTo')}</span><kbd className="rk-kbd">⌘ K</kbd></>}
                </button>
            </div>

            <nav className="rk-sidebar__nav">
                {item('/', t('home'), <RkIcon name="scena-wykres" />)}
                {item('/performances', t('productions'), <RkIcon name="scena-kotary" />, { value: counts.weekShows })}
                {/* Lista zadań należy do terminu, więc wchodzi się do niej z Kalendarza (README, aktualizacja 8.10). */}
                {item('/calendar', t('calendar'), <Calendar />, { value: counts.todayLists, tone: 'live' }, ['/lists', '/checklists'])}
                {!rail && <span className="rk-sidebar__label">{t('groupStorage')}</span>}
                {/* „Rekwizyty” i „Grupy” połączone w jeden „Magazyn”. */}
                {item('/groups', t('storage'), <Warehouse />, undefined, ['/scan'])}
                {item('/labels', t('qrLabels'), <QrCode />)}
                {!rail && <span className="rk-sidebar__label">{t('groupTeam')}</span>}
                {item('/notes', t('notes'), <NotebookPen />, { value: counts.mentions, tone: 'new' })}
            </nav>

            <div className="rk-sidebar__foot relative" ref={menuRef} style={rail ? { margin: '0 8px 12px', padding: '12px 0', justifyContent: 'center' } : undefined}>
                {profile === null ? (
                    <Link href="/login" className="rk-nav-item w-full">
                        <LogIn />{!rail && t('signIn')}
                    </Link>
                ) : profile ? (
                    <>
                        <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            onClick={() => setMenuOpen(o => !o)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            <RkAvatar name={avatarFor(profile.id)} size={32} />
                            {!rail && (
                                <span className="rk-sidebar__user">
                                    <b className="truncate">{profile.name}</b>
                                    {theatres.length > 1 && currentTheatre
                                        ? <small className="truncate">{theatres.find(th => th.id === currentTheatre)?.name}</small>
                                        : profile.role && <small>{ROLE[profile.role] ?? profile.role}</small>}
                                </span>
                            )}
                        </button>
                        {!rail && (
                            <Link href="/settings" className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" aria-label={t('settings')}>
                                <Settings2 />
                            </Link>
                        )}
                        {menuOpen && (
                            <div role="menu" className="rk-menu absolute bottom-full left-0 z-50 mb-2">
                                {theatres.length > 1 && (
                                    <>
                                        <span className="rk-sidebar__label" role="presentation">{t('theatre')}</span>
                                        {theatres.map(th => (
                                            <button key={th.id} role="menuitemradio" aria-checked={th.id === currentTheatre} className="rk-menu__item" onClick={() => pickTheatre(th.id)}>
                                                {th.id === currentTheatre ? <Check /> : <span style={{ width: 16 }} />}
                                                <span className="truncate">{th.name}</span>
                                            </button>
                                        ))}
                                        <div className="rk-menu__sep" role="separator" />
                                    </>
                                )}
                                <Link role="menuitem" className="rk-menu__item" href="/settings" onClick={() => setMenuOpen(false)}>
                                    <Settings />{t('settings')}
                                </Link>
                                <div className="rk-menu__sep" role="separator" />
                                <button role="menuitem" className="rk-menu__item" onClick={signOut}>
                                    <LogOut />{t('signOut')}
                                </button>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </aside>
    )
}
