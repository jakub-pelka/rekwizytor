import { getTranslations } from 'next-intl/server'
import { LegalFooter } from '@/components/rk/LegalFooter'

/**
 * Układ ekranu zaproszenia: ten sam co logowanie (.lg), z prawej częścią kurtyny.
 * Na telefonie CSS logowania zamienia kurtynę na niski pasek nad formularzem.
 */
export async function WelcomeShell({ children }: { children: React.ReactNode }) {
    const t = await getTranslations('Login')
    return (
        <div className="lg">
            <section className="ld-stage" aria-hidden="true">
                <video autoPlay muted loop playsInline preload="auto" poster="/media/logowanie/kurtyna-tlo-poster.jpg">
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
                {children}
                <LegalFooter />
            </div>
        </div>
    )
}
