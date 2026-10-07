import { getTranslations } from 'next-intl/server'
import { MobileTop } from '@/components/rk/MobileTop'

export async function generateMetadata() {
    const t = await getTranslations('Legal')
    return {
        title: `${t('privacyTitle')} · Rekwizytor`,
    }
}

export default async function PrivacyPage() {
    const t = await getTranslations('Legal')

    return (
        <div>
            <MobileTop back={{ href: '/', label: t('back') }} title={t('privacyTitle')} anchorId="privacy-title" />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
                <header className="rk-page-header">
                    <div>
                        <p className="rk-page-header__eyebrow">{t('privacyEyebrow')}</p>
                        <h1 id="privacy-title" className="rk-page-header__title">{t('privacyTitle')}</h1>
                    </div>
                </header>

                <div className="rk-card">
                    <div className="rk-card__body flex flex-col gap-4 text-sm leading-relaxed text-ink-muted">
                        <p className="text-ink">{t('privacyNotice')}</p>
                        <p>{t('privacyDesc')}</p>
                        <p>
                            {t('contactLabel')}{' '}
                            {/* DO ZMIANY: adres kontaktowy właściciela aplikacji */}
                            <a
                                href="mailto:kontakt@example.invalid"
                                className="text-kurtyna-text underline underline-offset-4 hover:opacity-80 transition-opacity"
                            >
                                kontakt@example.invalid
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
