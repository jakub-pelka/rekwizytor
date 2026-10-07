'use client'

import { LegalFooter } from '@/components/rk/LegalFooter'
import { checkSignupAllowed } from '@/app/actions/auth-check'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, ScanLine, Layers, ClipboardCheck, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import LightRays from '@/components/ui/LightRays'
import { Link } from '@/i18n/routing'

export default function LoginPage() {
    const t = useTranslations('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0
        let score = 0
        if (pass.length >= 8) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        return score
    }

    const passwordStrength = getPasswordStrength(password)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (isSignUp) {
            if (passwordStrength < 2) {
                setError(t('passwordTooWeak'))
                setLoading(false)
                return
            }

            const { allowed, message } = await checkSignupAllowed()
            if (!allowed) {
                setError(message || t('userLimitReached'))
                setLoading(false)
                return
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        full_name: name.trim(),
                    },
                },
            })
            if (error) {
                setError(error.message)
            } else {
                setMessage(t('checkEmail'))
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setError(error.message)
            } else {
                router.push('/')
                router.refresh()
            }
        }
        setLoading(false)
    }



    const features = [
        { icon: ScanLine, label: t('feature1') },
        { icon: Layers, label: t('feature2') },
        { icon: ClipboardCheck, label: t('feature3') },
        { icon: QrCode, label: t('feature4') },
    ]

    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-200 relative overflow-hidden">
            <LightRays
                raysOrigin="top-center"
                raysColor="#cfcfcf"
                raysSpeed={0.2}
                lightSpread={2.0}
                rayLength={1.0}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0}
                className="opacity-40"
            />

            {/* Showcase panel (desktop) */}
            <aside className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12 xl:p-16 border-r border-white/5 bg-linear-to-br from-burgundy-extra-dark/60 via-neutral-950/40 to-transparent">
                <div className="relative h-16 w-48">
                    <Image src="/brand/rekwizytor-logo-dark.svg" alt="Rekwizytor" fill className="object-contain object-left" priority />
                </div>

                <div className="max-w-lg space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-4xl xl:text-5xl text-white leading-tight">{t('showcaseTitle')}</h2>
                        <p className="font-courier text-lg text-neutral-400">{t('showcaseLead')}</p>
                    </div>
                    <ul className="space-y-4">
                        {features.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-burgundy-light/20 bg-burgundy-main/15 text-burgundy-light">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="text-neutral-300">{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="font-courier text-xs text-neutral-600">Rekwizytor · {new Date().getFullYear()}</p>
            </aside>

            {/* Form panel */}
            <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 relative z-10">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 relative h-28 w-72 lg:hidden">
                            <Image
                                src="/brand/rekwizytor-logo-pion-dark.svg"
                                alt="Rekwizytor"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="hidden lg:block text-2xl text-white mb-2">
                            {isSignUp ? t('signUp') : t('signIn')}
                        </h1>
                        <p className="text-sm text-neutral-400">
                            {isSignUp ? t('subtitleSignUp') : t('subtitleSignIn')}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-4">
                            {isSignUp && (
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block text-sm font-medium text-neutral-300 mb-1"
                                    >
                                        {t('name')}
                                    </label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="mt-1 border-neutral-800 bg-neutral-900/80 backdrop-blur-sm"
                                    />
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-neutral-300 mb-1"
                                >
                                    {t('email')}
                                </label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="inspector@theater.com"
                                    className="mt-1 border-neutral-800 bg-neutral-900/80 backdrop-blur-sm"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium text-neutral-300"
                                    >
                                        {t('password')}
                                    </label>
                                    <Link href="/forgot-password" className="text-xs text-neutral-400 hover:text-white transition-colors">
                                        {t('forgotPassword')}
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 border-neutral-800 bg-neutral-900/80 backdrop-blur-sm"
                                />
                                {isSignUp && password && (
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

                        <div className="flex flex-col gap-3">
                            <Button
                                type="submit"
                                variant="glassy-primary"
                                isLoading={loading}
                                className="w-full"
                            >
                                {isSignUp ? t('signUp') : t('signIn')}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-neutral-800"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-neutral-950 px-2 text-neutral-500">
                                        {t('or')}
                                    </span>
                                </div>
                            </div>

                            <Link href="/" className="block">
                                <Button
                                    type="button"
                                    variant="glassy-secondary"
                                    className="w-full"
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('browseWithoutLogin')}
                                </Button>
                            </Link>
                        </div>
                    </form>

                    <div className="text-center">
                        <Button
                            type="button"
                            variant="link"
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError(null)
                                setMessage(null)
                            }}
                            className="text-neutral-400 hover:text-white underline-offset-4"
                        >
                            {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}
                        </Button>
                    </div>

                    {/* Feature list (mobile) */}
                    <ul className="lg:hidden grid grid-cols-2 gap-2 pt-4 border-t border-neutral-800/60">
                        {features.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-start gap-2 text-xs text-neutral-400">
                                <Icon className="h-4 w-4 shrink-0 text-burgundy-light mt-0.5" />
                                <span>{label}</span>
                            </li>
                        ))}
                    </ul>

                    <LegalFooter className="pt-6" />
                </div>
            </main>
        </div>
    )
}
