import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { LegalFooter } from '@/components/rk/LegalFooter'

/**
 * Układ ekranu /witaj z plansz Witaj-kod: pusty, bez kurtyny i wideo (.kd, .kd-top, .kd-main).
 * Na telefonie nagłówek skraca się do „Zaloguj się”.
 */
export async function InviteShell({ children }: { children: React.ReactNode }) {
    const t = await getTranslations('Welcome')
    return (
        <div className="kd">
            <header className="kd-top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/rekwizytor-logo-dark.svg" alt="Rekwizytor" />
                <Link href="/login">
                    <span className="hidden sm:inline">{t('haveAccount')}</span>
                    <span className="sm:hidden">{t('signIn')}</span>
                </Link>
            </header>
            <main className="kd-main">{children}</main>
            <LegalFooter className="kd-foot" />
        </div>
    )
}
