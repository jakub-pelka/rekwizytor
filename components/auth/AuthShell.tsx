'use client'

import type { ReactNode, RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { LegalFooter } from '@/components/rk/LegalFooter'

interface AuthShellProps {
    children: ReactNode
    /** Lewy panel z kurtyną i wideo: /login rozsuwa je po zalogowaniu (lowerCurtain). */
    stageRef?: RefObject<HTMLElement | null>
    videoRef?: RefObject<HTMLVideoElement | null>
}

/**
 * Wspólny układ ekranów wejścia: lewy panel z kurtyną i logo, prawy na treść (.lg, .ld-stage, .lg-form-wrap).
 * Na telefonie kurtyna zmienia się w pasek nad treścią.
 */
export function AuthShell({ children, stageRef, videoRef }: AuthShellProps) {
    const t = useTranslations('Login')
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
                {children}
                <LegalFooter />
            </div>
        </div>
    )
}
