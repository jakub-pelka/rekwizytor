'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { lookupInvite } from '@/app/actions/invite-entry'
import type { InviteLookup } from './types'

interface InviteEmailStepProps {
    initialEmail?: string
    /** Komunikat z serwera (np. limit prób), gdy strona nie mogła sprawdzić adresu. */
    initialError?: string | null
    /** Adres bez zaproszenia (stan 'none') już na wejściu. */
    initialNotFound?: boolean
    /** Adres sprawdzony; lookup może być dowolnym stanem poza błędem. */
    onResolved: (email: string, lookup: InviteLookup) => void
}

/** Krok „Twój e-mail”: pytamy o adres, gdy wejście było bez ?email (plansza Witaj-kod-stany, 4). */
export function InviteEmailStep({ initialEmail = '', initialError = null, initialNotFound = false, onResolved }: InviteEmailStepProps) {
    const t = useTranslations('Welcome')
    const [email, setEmail] = useState(initialEmail)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(initialError ?? (initialNotFound ? t('emailNotFound') : null))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const value = email.trim()
        if (!value) {
            setError(t('emailRequired'))
            return
        }
        setError(null)
        setLoading(true)
        try {
            const res = await lookupInvite(value)
            if (!res.ok) {
                setError(res.error)
            } else if (!res.data || res.data.state === 'none') {
                setError(t('emailNotFound'))
            } else {
                onResolved(value, res.data)
            }
        } catch {
            setError(t('genericError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="kd-pane" onSubmit={submit} noValidate>
            <h2>{t('emailTitle')}</h2>
            <label className="rk-field">
                <span className="rk-label">{t('emailLabel')}</span>
                <input
                    className={`rk-input${error ? ' rk-input--error' : ''}`}
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
                    aria-invalid={error ? true : undefined}
                />
            </label>
            {error && <p className="kd-hint err" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="kd-full" isLoading={loading} loadingLabel={t('checking')}>
                {t('next')}
            </Button>
        </form>
    )
}
