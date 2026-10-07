'use client'

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface LegalFooterProps {
    className?: string
}

/**
 * Mała stopka prawna aplikacji Rekwizytor (Geist 12/16 ink-muted, linki w kolorze kurtyna-text).
 * Przeznaczona do umieszczenia pod treścią aplikacji (AppShell) oraz na ekranie logowania.
 */
export function LegalFooter({ className = '' }: LegalFooterProps) {
    const t = useTranslations('Legal')

    return (
        <footer
            className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4 px-4 text-[12px] leading-[16px] text-ink-muted ${className}`.trim()}
        >
            <span>{t('copyright')}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <Link
                href="/privacy"
                className="text-kurtyna-text underline-offset-2 hover:underline transition-colors"
            >
                {t('privacyLink')}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
                href="/terms"
                className="text-kurtyna-text underline-offset-2 hover:underline transition-colors"
            >
                {t('termsLink')}
            </Link>
        </footer>
    )
}
