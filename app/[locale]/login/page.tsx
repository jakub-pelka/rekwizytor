'use client'

import { LegalFooter } from '@/components/rk/LegalFooter'
import { checkSignupAllowed } from '@/app/actions/auth-check'
import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { lowerCurtain } from '@/components/rk/CurtainReveal'
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
    const [showPassword, setShowPassword] = useState(false)
    const stageRef = useRef<HTMLElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
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
                // Lewy panel rozsuwa się na cały ekran, dopiero wtedy przechodzimy na pulpit, a kurtyna idzie w górę,
                // gdy pulpit jest już na miejscu (CurtainReveal w layoucie, ekran Logowanie-przejscie).
                // Powrót pod adres, z którego przyszło logowanie (np. zeskanowana etykieta). Tylko ścieżki w aplikacji.
                const returnTo = new URLSearchParams(window.location.search).get('returnTo')
                const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
                router.prefetch(target)
                await lowerCurtain(stageRef.current, videoRef.current)
                router.push(target)
                router.refresh()
            }
        }
        setLoading(false)
    }



    const toggleMode = () => {
        setIsSignUp(v => !v)
        setError(null)
        setMessage(null)
    }

    return (
        <div className="lg">
            <section className="ld-stage" aria-hidden="true" ref={stageRef}>
                <video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster="/media/logowanie/kurtyna-tlo-poster.jpg">
                    <source src="/media/logowanie/kurtyna-tlo.webm" type="video/webm" />
                    <source src="/media/logowanie/kurtyna-tlo.mp4" type="video/mp4" />
                </video>
                <div className="ld-words">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/rekwizytor-logo-mono-bialy.svg" alt="Rekwizytor" />
                    <p className="lg-tag">{t('showcaseLead')}</p>
                </div>
            </section>

            <div className="lg-form-wrap">
                <form className="lg-form" onSubmit={handleAuth} aria-labelledby="lg-h">
                    <div>
                        <h1 id="lg-h">{isSignUp ? t('signUp') : t('signIn')}</h1>
                        <p className="lg-sub">{isSignUp ? t('subtitleSignUp') : t('signInLead')}</p>
                    </div>

                    <div className="lg-fields">
                        {isSignUp && (
                            <label className="rk-field">
                                <span className="rk-label">{t('name')}</span>
                                <input className="rk-input" id="name" name="name" type="text" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
                            </label>
                        )}
                        <label className="rk-field">
                            <span className="rk-label">{t('emailLabel')}</span>
                            <input className="rk-input" id="email" name="email" type="email" required autoComplete="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
                        </label>
                        <div className="rk-field">
                            <div className="lg-labelrow">
                                <label className="rk-label" htmlFor="password">{t('password')}</label>
                                <Link href="/forgot-password">{t('forgotShort')}</Link>
                            </div>
                            <div className="lg-pass">
                                <input
                                    className="rk-input"
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <button type="button" className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                            {isSignUp && password && (
                                <div className="mt-2 flex gap-1" aria-hidden="true">
                                    {[1, 2, 3, 4].map(level => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level
                                                ? passwordStrength >= 3 ? 'bg-success' : passwordStrength >= 2 ? 'bg-warning' : 'bg-danger'
                                                : 'bg-border'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <p className="lg-msg lg-msg--error" role="alert">{error}</p>}
                    {message && <p className="lg-msg lg-msg--ok" role="status">{message}</p>}

                    <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                        {isSignUp ? t('signUp') : t('signIn')}
                    </Button>

                    <p className="pl-meta" style={{ margin: 0, textAlign: 'center' }}>
                        {isSignUp ? (
                            <button type="button" className="pl-link lg-link" onClick={toggleMode}>{t('alreadyHaveAccount')}</button>
                        ) : (
                            <>{t('noAccount')} <button type="button" className="pl-link lg-link" onClick={toggleMode}>{t('askAccess')}</button></>
                        )}
                    </p>

                    <div className="lg-demo">
                        <p>{t('demoPrompt')}</p>
                        <Link
                            className="pl-link"
                            href="/"
                            onClick={async e => {
                                // Ta sama kurtyna co po zalogowaniu, tylko wolniejsza: 1,5 s w bok, 1 s w górę.
                                e.preventDefault()
                                router.prefetch('/')
                                await lowerCurtain(stageRef.current, videoRef.current, { slow: true })
                                router.push('/')
                            }}
                        >
                            {t('demoLink')}<ArrowRight />
                        </Link>
                    </div>
                </form>
                <LegalFooter />
            </div>
        </div>
    )
}
