'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, User, Globe, Shield, LayoutGrid, BarChart, Clock, Info, Check, MessageSquare } from 'lucide-react'
import { notify } from '@/utils/notify'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type UserData = {
    email: string | undefined
    full_name?: string | null
    id?: string
}

export function SettingsForm({ user }: { user: UserData }) {
    const t = useTranslations('SettingsForm')
    const tSettings = useTranslations('Settings')
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [fullName, setFullName] = useState(user.full_name || '')
    const { is24Hour, toggleFormat, mounted } = useTimeFormat()

    const handleSignOut = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const handleUpdateProfile = async () => {
        if (!user.id) return

        setUpdating(true)
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id)

        if (!error) {
            router.refresh()
            notify.successSaving('Profil zaktualizowany')
        } else {
            notify.error('Błąd aktualizacji profilu')
        }
        setUpdating(false)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
            {/* Profile Section */}
            <div className="space-y-4">
                <div className="text-base font-bold text-white flex items-center pl-1 font-sans! uppercase tracking-wider opacity-90">
                    <User className="mr-2 h-4 w-4 text-burgundy-light" />
                    {t('account')}
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-full transition-colors hover:border-neutral-700">
                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                {t('fullName')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all"
                                    placeholder="John Doe"
                                />
                                <Button
                                    onClick={handleUpdateProfile}
                                    disabled={updating || fullName === user.full_name}
                                    isLoading={updating}
                                    variant="secondary"
                                    size="icon"
                                    className="shrink-0"
                                >
                                    <Check className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                {t('emailAddress')}
                            </label>
                            <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-300 cursor-not-allowed opacity-75 sm:text-sm">
                                {user.email}
                            </div>
                            <p className="mt-2 text-xs text-neutral-500">
                                {t('managedViaSupabase')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-4">
                <div className="text-base font-bold text-white flex items-center pl-1 font-sans! uppercase tracking-wider opacity-90">
                    <Globe className="mr-2 h-4 w-4 text-blue-400" />
                    {t('appearance')}
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-full transition-colors hover:border-neutral-700 space-y-6">
                    {/* Language */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800/50">
                                <Globe className="h-5 w-5 text-neutral-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white text-sm">{tSettings('language')}</p>
                                <p className="text-xs text-neutral-500">Select your preferred language</p>
                            </div>
                        </div>
                        <div className="w-32 sm:w-40">
                            <LanguageSwitcher />
                        </div>
                    </div>

                    {/* Time Format */}
                    <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
                        <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800/50">
                                <Clock className="h-5 w-5 text-neutral-400" />
                            </div>
                            <div>
                                <p className="font-medium text-white text-sm">{t('timeFormat')}</p>
                                <p className="text-xs text-neutral-500">{t('timeFormatDescription')}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleFormat}
                            disabled={!mounted}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ai-primary focus:ring-offset-2 focus:ring-offset-neutral-900 ${is24Hour ? 'bg-ai-primary' : 'bg-neutral-700'}`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${is24Hour ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Workspace Management Section */}
            <div className="space-y-4">
                <div className="text-base font-bold text-white flex items-center pl-1 font-sans! uppercase tracking-wider opacity-90">
                    <LayoutGrid className="mr-2 h-4 w-4 text-purple-400" />
                    Management
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-full transition-colors hover:border-neutral-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">{tSettings('statsTitle')}</h3>
                            <p className="text-xs text-neutral-400 mt-1">{tSettings('statsDescription')}</p>
                        </div>
                        <Link href="/ai-stats">
                            <Button variant="glassy-secondary" size="sm" leftIcon={<BarChart className="w-4 h-4" />}>
                                {tSettings('viewStats')}
                            </Button>
                        </Link>
                    </div>

                    <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">QR Codes</h3>
                            <p className="text-xs text-neutral-400 mt-1">Manage universal redirects</p>
                        </div>
                        <Link href="/settings/qr-codes">
                            <Button variant="glassy-secondary" size="sm" leftIcon={<Globe className="w-4 h-4" />}>
                                {tSettings('manage')}
                            </Button>
                        </Link>
                    </div>

                    <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">Podpowiedzi i Poradniki</h3>
                            <p className="text-xs text-neutral-400 mt-1">Zarządzaj systemem podpowiedzi (Tour)</p>
                        </div>
                        <Link href="/settings/tours">
                            <Button variant="glassy-secondary" size="sm" leftIcon={<MessageSquare className="w-4 h-4" />}>
                                {tSettings('browse')}
                            </Button>
                        </Link>
                    </div>

                    <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">{t('aboutTitle')}</h3>
                            <p className="text-xs text-neutral-400 mt-1">{t('aboutDescription')}</p>
                        </div>
                        <Link href="/about">
                            <Button variant="glassy-secondary" size="sm" leftIcon={<Info className="w-4 h-4" />}>
                                {t('view')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4">
                <div className="text-base font-bold text-white flex items-center pl-1 font-sans! uppercase tracking-wider opacity-90">
                    <Shield className="mr-2 h-4 w-4 text-red-400" />
                    {t('security')}
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-full transition-colors hover:border-neutral-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">{t('changePassword')}</h3>
                            <p className="text-xs text-neutral-500">Update your password to keep your account secure</p>
                        </div>
                        <Link href="/settings/password">
                            <Button variant="glassy-secondary" size="sm" leftIcon={<Shield className="w-4 h-4" />}>
                                {t('changePassword')}
                            </Button>
                        </Link>
                    </div>

                    <div className="border-t border-neutral-800 pt-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-white text-sm">{t('signOut')}</p>
                            <p className="text-xs text-neutral-500">{t('signOutDescription')}</p>
                        </div>
                        <Button
                            onClick={handleSignOut}
                            disabled={loading}
                            variant="glassy-danger"
                            size="sm"
                            isLoading={loading}
                            leftIcon={<LogOut className="h-4 w-4" />}
                        >
                            {t('signOut')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
