'use client'

import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, NotebookPen, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { RkAvatar, avatarFor } from '@/components/rk/RkAvatar'

type Props = {
    isOpen: boolean
    onClose: () => void
}

type Profile = {
    id: string
    name: string
    role: string | null
}

// Menu konta na telefonie (arkusz od dołu .rk-sheet, otwierany z AccountMenuButton w MobileTop).
export function MobileMenu({ isOpen, onClose }: Props) {
    const t = useTranslations('Navigation')
    const router = useRouter()
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
    const sheetRef = useRef<HTMLDivElement>(null)

    // Pobranie danych profilu (identycznie jak w Sidebar.tsx)
    useEffect(() => {
        if (!isOpen) return
        const supabase = createClient()
        let active = true

        void (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!active) return

                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('full_name, role')
                        .eq('id', user.id)
                        .single()
                    if (!active) return

                    setProfile({
                        id: user.id,
                        name: data?.full_name || user.email?.split('@')[0] || '',
                        role: data?.role ?? null,
                    })
                } else {
                    setProfile(null)
                }
            } catch {
                if (active) setProfile(null)
            }
        })()

        return () => {
            active = false
        }
    }, [isOpen])

    // Blokada przewijania strony pod spodem
    useEffect(() => {
        if (!isOpen) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [isOpen])

    // Zarządzanie fokusem i obsługa klawisza Escape
    useEffect(() => {
        if (!isOpen) return
        const prevFocus = document.activeElement as HTMLElement | null

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        document.addEventListener('keydown', onKeyDown)

        const timer = setTimeout(() => {
            const first = sheetRef.current?.querySelector<HTMLElement>(
                'a, button, [tabindex]:not([tabindex="-1"])'
            )
            first?.focus()
        }, 0)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            clearTimeout(timer)
            prevFocus?.focus()
        }
    }, [isOpen, onClose])

    const handleSignOut = async () => {
        onClose()
        await createClient().auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const handleMenuKeyDown = (e: React.KeyboardEvent) => {
        const items = sheetRef.current?.querySelectorAll<HTMLElement>(
            '.rk-menu__item, .rk-btn'
        )
        if (!items || items.length === 0) return
        const list = Array.from(items)
        const idx = list.indexOf(document.activeElement as HTMLElement)

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const next = idx === -1 ? 0 : (idx + 1) % list.length
            list[next]?.focus()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prev = idx === -1 ? list.length - 1 : (idx - 1 + list.length) % list.length
            list[prev]?.focus()
        }
    }

    if (!isOpen) return null

    const ROLE: Record<string, string> = {
        admin: t('roleAdmin'),
        manager: t('roleManager'),
        user: t('roleUser'),
    }

    return (
        <div
            className="rk-overlay fixed inset-0 z-50 md:hidden !p-0 overflow-hidden"
            onClick={e => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('more')}
                className="rk-sheet rk-enter w-full max-h-[85vh] overflow-y-auto"
                style={{
                    animation: 'rk-curtain-in var(--dur-curtain) var(--ease-curtain) both',
                    paddingBottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))',
                }}
                onClick={e => e.stopPropagation()}
                onKeyDown={handleMenuKeyDown}
            >
                <span className="rk-sheet__grip" aria-hidden="true" />
                <h2 className="sr-only">{t('more')}</h2>

                {profile ? (
                    <div className="flex items-center gap-3">
                        <RkAvatar name={avatarFor(profile.id)} size={40} />
                        <div className="min-w-0 flex-1">
                            <b className="block truncate font-medium text-sm text-[var(--ink)]">
                                {profile.name}
                            </b>
                            {profile.role && (
                                <small className="block text-xs text-[var(--ink-muted)]">
                                    {ROLE[profile.role] ?? profile.role}
                                </small>
                            )}
                        </div>
                    </div>
                ) : profile === null ? (
                    <Link
                        href="/login"
                        onClick={onClose}
                        className="rk-btn rk-btn--primary w-full"
                    >
                        <LogIn />
                        <span>{t('signIn')}</span>
                    </Link>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="rk-skel rounded-md" style={{ width: 40, height: 40 }} />
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="rk-skel rk-skel--line" style={{ width: '60%' }} />
                            <div className="rk-skel rk-skel--line" style={{ width: '40%' }} />
                        </div>
                    </div>
                )}

                <div role="menu" className="flex flex-col">
                    <Link
                        role="menuitem"
                        href="/notes"
                        onClick={onClose}
                        className="rk-menu__item"
                        style={{ minHeight: 44, height: 44 }}
                    >
                        <NotebookPen />
                        <span>{t('notes')}</span>
                    </Link>

                    <Link
                        role="menuitem"
                        href="/settings"
                        onClick={onClose}
                        className="rk-menu__item"
                        style={{ minHeight: 44, height: 44 }}
                    >
                        <Settings />
                        <span>{t('settings')}</span>
                    </Link>

                    {profile && (
                        <>
                            <div className="rk-menu__sep" role="separator" />
                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleSignOut}
                                className="rk-menu__item w-full"
                                style={{ minHeight: 44, height: 44 }}
                            >
                                <LogOut />
                                <span>{t('signOut')}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
