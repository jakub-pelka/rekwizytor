'use client'

import { Link } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
import { Calendar, Camera, Warehouse } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RkIcon } from './RkIcon'

// Dolne menu na telefonie (karta MobileNav, .rk-tabbar): 4 sekcje i środkowy „Skanuj”,
// jedyny przycisk z pieczątką w pasku. Aktywna sekcja: pigułka kurtyna-tint i aria-current.
export function TabBar() {
    const t = useTranslations('Navigation')
    const pathname = usePathname().replace(/^\/(?:pl|en)(?=\/|$)/, '') || '/'

    // Tryb na żywo ma własny ekran bez dolnego menu.
    if (pathname.includes('/live') || pathname.startsWith('/scan')) return null

    const isActive = (href: string, also: string[] = []) =>
        href === '/' ? pathname === '/' : [href, ...also].some(h => pathname.startsWith(h))

    const item = (href: string, label: string, icon: React.ReactNode, also?: string[]) => (
        <Link className="rk-tab-item" href={href} aria-current={isActive(href, also) ? 'page' : undefined}>
            <span className="rk-tab-item__pill">{icon}</span>
            {label}
        </Link>
    )

    return (
        <nav
            className="rk-tabbar fixed inset-x-0 bottom-0 z-50 md:hidden"
            style={{ paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))' }}
            aria-label={t('mainNavigation')}
        >
            {item('/', t('home'), <RkIcon name="scena-wykres" />)}
            {item('/groups', t('storage'), <Warehouse />)}
            <Link className="rk-tab-scan" href="/scan">
                <span className="rk-btn rk-btn--primary"><Camera /></span>
                {t('scan')}
            </Link>
            {item('/performances', t('productions'), <RkIcon name="scena-kotary" />)}
            {item('/calendar', t('calendar'), <Calendar />, ['/lists', '/checklists'])}
        </nav>
    )
}
