'use client'

import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { CodeInput } from './CodeInput'
import type { InviteLookup } from './types'

type StateLookup = Extract<InviteLookup, { state: 'locked' | 'expired' | 'revoked' | 'account' }>

interface InviteStateMessageProps {
    lookup: StateLookup
    /** Domyślnie link do /login. Na ekranie logowania można podać własną akcję (np. wyczyszczenie kroków). */
    onBackToLogin?: () => void
}

const Icon = ({ children }: { children: ReactNode }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
)

/** Stany końcowe wejścia kodem: zablokowane, wygasłe, cofnięte, konto już istnieje (plansza Witaj-kod-stany, 2, 3, 5, 6). */
export function InviteStateMessage({ lookup, onBackToLogin }: InviteStateMessageProps) {
    const t = useTranslations('Welcome')
    const locale = useLocale()

    const back = onBackToLogin
        ? <button type="button" className="rk-btn rk-btn--secondary kd-full" style={{ justifyContent: 'center' }} onClick={onBackToLogin}>{t('backToLogin')}</button>
        : <Link className="rk-btn rk-btn--secondary kd-full" style={{ justifyContent: 'center' }} href="/login">{t('backToLogin')}</Link>

    if (lookup.state === 'locked') {
        return (
            <div className="kd-pane">
                <h2>{t('codeTitle')}</h2>
                <CodeInput value="" onChange={() => {}} disabled />
                <div className="rk-alert rk-alert--danger" role="alert">
                    <Icon><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></Icon>
                    <div>
                        <strong>{t('lockedTitle')}</strong>
                        {lookup.inviterName ? t('lockedBodyNamed', { name: lookup.inviterName }) : t('lockedBody')}
                    </div>
                </div>
                {back}
            </div>
        )
    }

    if (lookup.state === 'expired') {
        const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' }).format(new Date(lookup.expiresAt))
        return (
            <div className="np-end">
                <span className="np-end__ico np-end__ico--warn"><Icon><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon></span>
                <h3>{t('expiredTitle')}</h3>
                <p>{t('expiredBody', { date })}</p>
                {onBackToLogin
                    ? <button type="button" className="rk-btn rk-btn--secondary" onClick={onBackToLogin}>{t('backToLogin')}</button>
                    : <Link className="rk-btn rk-btn--secondary" href="/login">{t('backToLogin')}</Link>}
            </div>
        )
    }

    if (lookup.state === 'revoked') {
        return (
            <div className="np-end">
                <span className="np-end__ico np-end__ico--warn"><Icon><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></Icon></span>
                <h3>{t('revokedTitle')}</h3>
                <p>{lookup.inviterName ? t('revokedBodyNamed', { name: lookup.inviterName }) : t('revokedBody')}</p>
                {onBackToLogin
                    ? <button type="button" className="rk-btn rk-btn--secondary" onClick={onBackToLogin}>{t('backToLogin')}</button>
                    : <Link className="rk-btn rk-btn--secondary" href="/login">{t('backToLogin')}</Link>}
            </div>
        )
    }

    return (
        <div className="np-end">
            <span className="np-end__ico"><Icon><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></Icon></span>
            <h3>{t('accountTitle')}</h3>
            <p>{t('accountBody')}</p>
            {onBackToLogin
                ? <button type="button" className="rk-btn rk-btn--primary" onClick={onBackToLogin}>{t('signIn')}</button>
                : <Link className="rk-btn rk-btn--primary" href="/login">{t('signIn')}</Link>}
        </div>
    )
}
