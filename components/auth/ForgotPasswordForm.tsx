'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function ForgotPasswordForm() {
    const t = useTranslations('Login')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/pl/auth/confirm?next=/pl/update-password`,
        })

        if (error) {
            setError(error.message)
        } else {
            setMessage(t('emailSent'))
        }
        setLoading(false)
    }

    return (
        <div className="w-full max-w-md space-y-8 relative z-10">
            <div className="flex flex-col items-center text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{t('resetPassword')}</h2>
                <p className="text-sm text-neutral-400">
                    {t('sendResetLink')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-neutral-300"
                    >
                        {t('email')}
                    </label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-md border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm pl-10 pr-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                            placeholder="inspector@theater.com"
                        />
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
                    {t('sendResetLink')}
                </Button>

                <div className="text-center">
                    <Link
                        href="/login"
                        className={buttonVariants({ variant: 'link', className: "text-neutral-400 hover:text-white" })}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('backToLogin')}
                    </Link>
                </div>
            </form>
        </div>
    )
}
