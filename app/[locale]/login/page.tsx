'use client'

import { LegalFooter } from '@/components/rk/LegalFooter'
import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { lowerCurtain } from '@/components/rk/CurtainReveal'
import { Link } from '@/i18n/routing'
import { InviteHeader } from '@/components/auth/invite/InviteHeader'
import { InviteEmailStep } from '@/components/auth/invite/InviteEmailStep'
import { InviteCodeStep } from '@/components/auth/invite/InviteCodeStep'
import { InviteDetailsStep } from '@/components/auth/invite/InviteDetailsStep'
import { InviteStateMessage } from '@/components/auth/invite/InviteStateMessage'
import type { InviteLookup, InviteWho } from '@/components/auth/invite/types'

type EndState = Extract<InviteLookup, { state: 'locked' | 'expired' | 'revoked' }>

// Prawa strona ekranu: zwykłe logowanie albo kroki wejścia z zaproszenia (plansze Logowanie-zaproszenie*).
type Panel =
    | { kind: 'login' }
    | { kind: 'email'; email: string; notFound: boolean }
    | { kind: 'code'; email: string; attemptsLeft: number; who: InviteWho }
    | { kind: 'details'; who: InviteWho }
    | { kind: 'end'; lookup: EndState; who: InviteWho | null }
    | { kind: 'account'; email: string }

export default function LoginPage() {
    const t = useTranslations('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [panel, setPanel] = useState<Panel>({ kind: 'login' })
    const stageRef = useRef<HTMLElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const router = useRouter()
    const supabase = createClient()

    // Lewy panel rozsuwa się na cały ekran, dopiero wtedy przechodzimy na pulpit, a kurtyna idzie w górę,
    // gdy pulpit jest już na miejscu (CurtainReveal w layoucie, ekran Logowanie-przejscie).
    // Powrót pod adres, z którego przyszło logowanie (np. zeskanowana etykieta). Tylko ścieżki w aplikacji.
    const enter = async () => {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo')
        const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
        router.prefetch(target)
        await lowerCurtain(stageRef.current, videoRef.current)
        router.push(target)
        router.refresh()
    }

    const signIn = async (address: string) => {
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email: address, password })
        if (error) {
            setError(error.message)
        } else {
            await enter()
        }
        setLoading(false)
    }

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault()
        void signIn(panel.kind === 'account' ? panel.email : email)
    }

    const openPanel = (next: Panel) => {
        setError(null)
        setPassword('')
        setShowPassword(false)
        setPanel(next)
    }

    // Wynik sprawdzenia adresu albo złego kodu: przejście do właściwego kroku.
    const applyLookup = (address: string, lookup: InviteLookup) => {
        switch (lookup.state) {
            case 'code':
                openPanel({ kind: 'code', email: address, attemptsLeft: lookup.attemptsLeft, who: { inviterName: lookup.inviterName, theatreName: lookup.theatreName } })
                break
            case 'account':
                openPanel({ kind: 'account', email: address })
                break
            case 'none':
                openPanel({ kind: 'email', email: address, notFound: true })
                break
            default:
                openPanel({ kind: 'end', lookup, who: { inviterName: lookup.inviterName, theatreName: lookup.theatreName } })
        }
    }

    const passwordField = (
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
                    autoComplete="current-password"
                    autoFocus={panel.kind === 'account'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                </button>
            </div>
        </div>
    )

    const backLink = (text: string, action: string, onClick: () => void) => (
        <p className="lz-back">{text} <a href="#" onClick={e => { e.preventDefault(); onClick() }}>{action}</a></p>
    )

    let right: React.ReactNode
    if (panel.kind === 'login') {
        right = (
            <form className="lg-form" onSubmit={handleAuth} aria-labelledby="lg-h">
                <div>
                    <h1 id="lg-h">{t('signIn')}</h1>
                    <p className="lg-sub">{t('signInLead')}</p>
                </div>

                <div className="lg-fields">
                    <label className="rk-field">
                        <span className="rk-label">{t('emailLabel')}</span>
                        <input className="rk-input" id="email" name="email" type="email" required autoComplete="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
                    </label>
                    {passwordField}
                </div>

                {error && <p className="lg-msg lg-msg--error" role="alert">{error}</p>}

                <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                    {t('signIn')}
                </Button>

                {backLink(t('noAccountYet'), t('haveInvite'), () => openPanel({ kind: 'email', email, notFound: false }))}

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
        )
    } else if (panel.kind === 'account') {
        right = (
            <form className="lg-form lz-form" onSubmit={handleAuth} aria-labelledby="lg-h">
                <div>
                    <h1 id="lg-h">{t('accountTitle')}</h1>
                    <p className="lg-sub">{t('accountLead')}</p>
                </div>
                <div className="lz-mailrow">
                    <span>{panel.email}</span>
                    <a href="#" onClick={e => { e.preventDefault(); openPanel({ kind: 'email', email: panel.email, notFound: false }) }}>{t('change')}</a>
                </div>
                {passwordField}
                {error && <p className="lg-msg lg-msg--error" role="alert">{error}</p>}
                <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                    {t('signIn')}
                </Button>
            </form>
        )
    } else {
        const toLogin = () => openPanel({ kind: 'login' })
        const toEmail = () => openPanel({ kind: 'email', email: '', notFound: false })
        right = (
            <div className="lg-form lz-form">
                {panel.kind === 'email' && (
                    <>
                        <InviteEmailStep
                            key={panel.email + String(panel.notFound)}
                            initialEmail={panel.email}
                            initialNotFound={panel.notFound}
                            onResolved={applyLookup}
                        />
                        {backLink(t('haveAccount'), t('signIn'), toLogin)}
                    </>
                )}
                {panel.kind === 'code' && (
                    <>
                        <InviteHeader {...panel.who} />
                        <InviteCodeStep
                            email={panel.email}
                            attemptsLeft={panel.attemptsLeft}
                            onDone={() => setPanel({ kind: 'details', who: panel.who })}
                            onState={l => applyLookup(panel.email, l)}
                        />
                        {backLink(t('otherAddress'), t('back'), () => openPanel({ kind: 'email', email: panel.email, notFound: false }))}
                    </>
                )}
                {panel.kind === 'details' && (
                    <>
                        <InviteHeader {...panel.who} />
                        <InviteDetailsStep onDone={() => void enter()} />
                    </>
                )}
                {panel.kind === 'end' && (
                    <>
                        {panel.who && <InviteHeader {...panel.who} />}
                        <InviteStateMessage lookup={panel.lookup} onBackToLogin={toLogin} />
                        {panel.lookup.state === 'locked' && backLink(t('otherAddress'), t('back'), toEmail)}
                    </>
                )}
            </div>
        )
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
                {right}
                <LegalFooter />
            </div>
        </div>
    )
}
