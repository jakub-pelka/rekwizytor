'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { getPasswordStrength } from '@/lib/password-strength'

export function ChangePasswordForm({ redirectTo = '/settings' }: { redirectTo?: string }) {
    const t = useTranslations('Login')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const passwordStrength = getPasswordStrength(password)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'))
            setLoading(false)
            return
        }

        if (passwordStrength < 2) {
            setError(t('passwordTooWeak'))
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
        } else {
            setMessage(t('passwordUpdated'))
            if (redirectTo) {
                setTimeout(() => {
                    router.push(redirectTo)
                }, 1500)
            }
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="new-password"
                        className="block text-sm font-medium text-neutral-300"
                    >
                        {t('newPassword')}
                    </label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                            id="new-password"
                            name="new-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm pl-10 pr-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        />
                    </div>
                    {password && (
                        <div className="mt-2 flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level
                                        ? passwordStrength >= 3
                                            ? 'bg-green-500'
                                            : passwordStrength >= 2
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        : 'bg-neutral-800'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="confirm-password"
                        className="block text-sm font-medium text-neutral-300"
                    >
                        {t('confirmPassword')}
                    </label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm pl-10 pr-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/50 backdrop-blur-sm">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-md bg-green-900/20 p-3 text-sm text-green-400 border border-green-900/50 backdrop-blur-sm">
                    {message}
                </div>
            )}

            <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="w-full"
            >
                {t('updatePassword')}
            </Button>
        </form>
    )
}
