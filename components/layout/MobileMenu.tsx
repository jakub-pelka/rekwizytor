'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { X, BarChart, Settings, LogOut, Tag, Layers, ClipboardList } from 'lucide-react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'

type Props = {
    isOpen: boolean
    onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: Props) {
    const t = useTranslations('Navigation')
    const router = useRouter()
    const supabase = createClient()
    const pathname = usePathname() // Import needed! Wait, import is missing.

    const menuItems = [
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('groups'), href: '/groups', icon: Tag },
        { name: t('settings'), href: '/settings', icon: Settings },
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <Transition show={isOpen}>
            <Dialog as="div" className="relative z-50 md:hidden" onClose={onClose}>
                <TransitionChild
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center text-center sm:items-center sm:p-0">
                        <TransitionChild
                            enter="transform transition ease-in-out duration-300"
                            enterFrom="translate-y-full"
                            enterTo="translate-y-0"
                            leave="transform transition ease-in-out duration-300"
                            leaveFrom="translate-y-0"
                            leaveTo="translate-y-full"
                        >
                            <DialogPanel className="relative w-full transform overflow-hidden rounded-t-2xl bg-[#1a1a1a] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                                <div className="absolute right-4 top-4">
                                    <button
                                        type="button"
                                        className="rounded-md text-neutral-400 hover:text-white focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="mt-3">
                                    <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-white mb-6">
                                        {t('more')}
                                    </DialogTitle>
                                    <div className="grid grid-cols-1 gap-2">
                                        {menuItems.map((item) => {
                                            const isActive = pathname === item.href || pathname.startsWith(item.href) && item.href !== '/settings'

                                            // Handle settings specifically if needed, or general logic
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={onClose}
                                                    className={clsx(
                                                        'flex items-center gap-3 rounded-lg p-3 transition-colors',
                                                        isActive
                                                            ? 'bg-neutral-800 text-white'
                                                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                                                    )}
                                                >
                                                    <item.icon className={clsx("h-5 w-5", isActive ? "text-white" : "text-neutral-500")} />
                                                    <span className="font-medium whitespace-nowrap">{item.name}</span>
                                                </Link>
                                            )
                                        })}

                                        <div className="my-2 border-t border-neutral-800" />

                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-3 rounded-lg p-3 text-red-400 hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            <span className="font-medium">{t('signOut')}</span>
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
