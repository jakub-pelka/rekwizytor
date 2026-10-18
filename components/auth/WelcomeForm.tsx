'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/utils/supabase/client'
import { getPasswordStrength, MIN_PASSWORD_STRENGTH } from '@/lib/password-strength'

interface WelcomeFormProps {
    theatreName: string
    /** Gotowa linijka „Zaprosiła cię …” albo null, gdy nie wiemy, kto zapraszał. */
    inviterLine: string | null
    initials: string
    email: string
    roleLabel: string | null
}

export function WelcomeForm({ theatreName, inviterLine, initials, email, roleLabel }: WelcomeFormProps) {
    const t = useTranslations('Welcome')
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    // Gdy hasło już zapisano, a zapis członkostwa się nie udał, ponowna próba nie ustawia hasła drugi raz.
    const passwordSaved = useRef(false)

    const strength = getPasswordStrength(password)
    const meterHint = !password
        ? t('meterEmpty')
        : strength <= 1 ? t('meterWeak')
        : strength === 2 ? t('meterOk')
        : strength === 3 ? t('meterGood')
        : t('meterStrong')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setNameError(null)
        setPasswordError(null)
        setFormError(null)

        const fullName = name.trim()
        let invalid = false
        if (!fullName) {
            setNameError(t('nameRequired'))
            invalid = true
        }
        if (strength < MIN_PASSWORD_STRENGTH) {
            setPasswordError(t('passwordTooWeak'))
            invalid = true
        }
        if (invalid) return

        setLoading(true)
        try {
            if (!passwordSaved.current) {
                const { error } = await supabase.auth.updateUser({ password, data: { full_name: fullName } })
                if (error && error.code !== 'same_password') {
                    if (error.code === 'weak_password') setPasswordError(t('passwordTooWeak'))
                    else setFormError(t('saveError'))
                    return
                }
                passwordSaved.current = true
            }
            // Funkcja z migracji 20261018_team_managers; do czasu przegenerowania typów wywołanie bez typów.
            const { error: rpcError } = await supabase.rpc('complete_invite' as never, { p_full_name: fullName } as never)
            if (rpcError) {
                setFormError(t('saveError'))
                return
            }
            router.replace('/')
            router.refresh()
        } catch {
            setFormError(t('saveError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="lg-form" onSubmit={handleSubmit} noValidate aria-labelledby="wt-h">
            <div>
                <h1 id="wt-h">{t('title')}</h1>
                <p className="lg-sub">{t('lead', { theatre: theatreName })}</p>
            </div>

            <div className="np-who">
                <span className="np-ini" style={{ ['--ini' as string]: '#6E1720' }} aria-hidden="true">{initials}</span>
                <div>
                    {inviterLine && <b>{inviterLine}</b>}
                    <small>{email}</small>
                </div>
                {roleLabel && <span className="rk-badge rk-badge--plain">{roleLabel}</span>}
            </div>

            <div className="lg-fields">
                <label className="rk-field">
                    <span className="rk-label">{t('nameLabel')}</span>
                    <input
                        className={`rk-input${nameError ? ' rk-input--error' : ''}`}
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        aria-invalid={nameError ? true : undefined}
                    />
                    <span className={`rk-hint${nameError ? ' rk-hint--error' : ''}`}>{nameError ?? t('nameHint')}</span>
                </label>

                <div className="rk-field">
                    <label className="rk-label" htmlFor="wt-pass">{t('passwordLabel')}</label>
                    <div className="lg-pass">
                        <input
                            className={`rk-input${passwordError ? ' rk-input--error' : ''}`}
                            id="wt-pass"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            aria-invalid={passwordError ? true : undefined}
                        />
                        <button type="button" className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>
                            {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                    </div>
                    <div className="np-meter" data-s={password ? Math.max(strength, 1) : undefined}>
                        <div className="np-meter__bar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                        <small role={passwordError ? 'alert' : undefined}>{passwordError ?? meterHint}</small>
                    </div>
                </div>
            </div>

            {formError && <p className="lg-msg lg-msg--error" role="alert">{formError}</p>}

            <Button type="submit" size="lg" className="w-full" isLoading={loading} loadingLabel={t('saving')}>
                {t('submit')}
            </Button>

            <p className="np-fine">{t('fine')}</p>
        </form>
    )
}
