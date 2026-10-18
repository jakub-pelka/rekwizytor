'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'

/** Stany końcowe ekranu zaproszenia: link wygasł i konto już dołączone (plansza Zaproszenie-stany, 3 i 4). */
export function WelcomeEnd({ kind, inviterName }: { kind: 'expired' | 'joined'; inviterName: string | null }) {
    const t = useTranslations('Welcome')
    const router = useRouter()
    const [busy, setBusy] = useState(false)

    // Sesja z linku (albo z innego konta) nie może odbijać nas z logowania z powrotem na pulpit.
    const goToLogin = async () => {
        setBusy(true)
        try {
            await createClient().auth.signOut({ scope: 'local' })
        } catch {
            // Wylogowanie lokalne nie może zablokować drogi do logowania.
        }
        router.push('/login')
        router.refresh()
    }

    if (kind === 'expired') {
        return (
            <div className="lg-form">
                <div className="np-end">
                    <span className="np-end__ico np-end__ico--warn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </span>
                    <h1>{t('expiredTitle')}</h1>
                    <p>{inviterName ? t('expiredBodyNamed', { name: inviterName }) : t('expiredBody')}</p>
                    <Link className="rk-btn rk-btn--secondary" href="/login">{t('backToLogin')}</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="lg-form">
            <div className="np-end">
                <span className="np-end__ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                </span>
                <h1>{t('joinedTitle')}</h1>
                <p>{t('joinedBody')}</p>
                <button type="button" className="rk-btn rk-btn--primary" onClick={goToLogin} disabled={busy}>{t('signIn')}</button>
            </div>
        </div>
    )
}
