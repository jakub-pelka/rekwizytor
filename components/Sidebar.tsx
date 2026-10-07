
'use client'

import { Link, useRouter } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Theater, Box, Layers, ClipboardList, Settings, LogOut, LogIn, Sparkles, StickyNote, Tag, CheckCircle2, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { isFeatureEnabled } from '@/utils/features'
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const t = useTranslations('Navigation')
    const { openSearch } = useGlobalSearch()
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setIsSignedIn(user !== null))
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsSignedIn(session !== null)
        })
        return () => subscription.unsubscribe()
    }, [supabase])

    // Remove locale from pathname for comparison (e.g., /pl/performances -> /performances)
    const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')

    const navigation = [
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('groups'), href: '/groups', icon: Tag },
        { name: t('notes'), href: '/notes', icon: StickyNote },
        { name: t('checklists'), href: '/checklists', icon: ClipboardList },
        ...(isFeatureEnabled('EXPERIMENTAL_MAPPING') ? [
            { name: "Mapowanie (Experymentalne)", href: '/mapping', icon: Sparkles }
        ] : [])
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
            <div className="flex min-h-0 flex-1 flex-col bg-[#1a1a1a] border-r border-neutral-800">
                <div className="flex flex-col gap-5 p-4 border-b border-neutral-800/50">
                    <Link href="/" className="flex items-center justify-center mt-2.5 mb-2 hover:opacity-80 transition-opacity">
                        <h1 className="font-bold text-white text-xl tracking-tight leading-none">Rekwizytor</h1>
                    </Link>


                </div>
                <div className="flex flex-1 flex-col overflow-y-auto pt-2 pb-4">
                    <nav className="mt-2 flex-1 space-y-1 px-3">
                        <button
                            onClick={() => openSearch()}
                            className="w-full bg-[#0d0d0d] border border-neutral-800 rounded-xl py-2 px-4 text-sm text-neutral-500 hover:text-neutral-400 hover:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all flex items-center gap-3 mb-3.5"
                        >
                            <Search className="w-4 h-4 text-neutral-600 shrink-0" />
                            <span className="flex-1 text-left text-neutral-500">Szukaj...</span>
                            <div className="bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 shrink-0 flex items-center">
                                <span className="text-[10px] font-medium text-neutral-400 leading-none">⌘ K</span>
                            </div>
                        </button>
                        {navigation.map((item) => {
                            const isActive = pathnameWithoutLocale.startsWith(item.href) && !navigation.some(nav =>
                                nav !== item &&
                                nav.href.startsWith(item.href) &&
                                nav.href.length > item.href.length &&
                                pathnameWithoutLocale.startsWith(nav.href)
                            )
                            return (
                                <div key={item.name} className="relative group">
                                    <Link
                                        href={item.href}
                                        className={clsx(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative z-10',
                                            isActive
                                                ? 'bg-neutral-800 text-white'
                                                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                        )}
                                    >
                                        <item.icon
                                            className={clsx(
                                                'w-5 h-5 transition-colors',
                                                isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="flex-1 text-left">{item.name}</span>
                                    </Link>
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active-indicator"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded-r-full pointer-events-none z-20"
                                            initial={{ opacity: 0, scaleY: 0 }}
                                            animate={{ opacity: 1, scaleY: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </nav>
                </div>
                <div className="p-4 bg-[#1a1a1a]">
                    <div className="bg-[#141414] rounded-xl border border-neutral-800/50 p-2 flex flex-col gap-0.5 shadow-sm">
                        <Link
                            href="/settings"
                            className={clsx(
                                pathname.startsWith('/settings')
                                    ? 'text-white bg-neutral-800'
                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50',
                                'group flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all'
                            )}
                        >
                            <Settings className={clsx(
                                pathname.startsWith('/settings') ? 'text-white' : 'text-neutral-600 group-hover:text-white',
                                'mr-3 h-4 w-4 transition-colors'
                            )} />
                            {t('settings')}
                        </Link>
                        {isSignedIn === false ? (
                            <Link
                                href="/login"
                                className="group flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all text-burgundy-light hover:text-white hover:bg-burgundy-main/20"
                            >
                                <LogIn className="mr-3 h-4 w-4" />
                                {t('signIn')}
                            </Link>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={handleSignOut}
                                className="w-full justify-start px-3 py-2 text-xs font-medium text-neutral-500 hover:text-red-300 hover:bg-red-900/10"
                                leftIcon={<LogOut className="h-4 w-4 text-neutral-600 group-hover:text-red-400" />}
                            >
                                {t('signOut')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
