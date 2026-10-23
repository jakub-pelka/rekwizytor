'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/utils/supabase/client'
import { getPasswordStrength, MIN_PASSWORD_STRENGTH } from '@/lib/password-strength'

interface InviteDetailsStepProps {
    initialName?: string
    /** Po zapisie. Domyślnie przejście na pulpit (router.replace('/') + refresh). */
    onDone?: () => void
}

/** Krok „Imię i hasło” (plansze Witaj-kod-dane). Zakłada sesję z kroku z kodem. Zapis: updateUser + rpc complete_invite. */
export function InviteDetailsStep({ initialName = '', onDone }: InviteDetailsStepProps) {
    const t = useTranslations('Welcome')
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const [name, setName] = useState(initialName)
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
            if (onDone) {
                onDone()
            } else {
                router.replace('/')
                router.refresh()
            }
        } catch {
            setFormError(t('saveError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="kd-pane" onSubmit={handleSubmit} noValidate>
            <h2>{t('detailsTitle')}</h2>
            <div className="lg-fields">
                <div className="rk-field">
                    <label className="rk-label" htmlFor="wt-name">{t('nameLabel')}</label>
                    <input
                        className={`rk-input${nameError ? ' rk-input--error' : ''}`}
                        id="wt-name"
                        name="name"
                        autoComplete="name"
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        aria-invalid={nameError ? true : undefined}
                        aria-describedby={nameError ? 'wt-name-err' : undefined}
                        autoFocus
                    />
                    {nameError && <small id="wt-name-err" className="rk-hint rk-hint--error" role="alert">{nameError}</small>}
                </div>
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

            <Button type="submit" size="lg" className="kd-full" isLoading={loading} loadingLabel={t('saving')}>
                {t('submit')}
            </Button>
        </form>
    )
}
