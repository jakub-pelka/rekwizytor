'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@/i18n/routing'
import { ChevronLeft } from 'lucide-react'

type Props = {
    /** Cofanie z nazwą miejsca, do którego wracasz: „‹ Spektakle”. Strzałka i napis to jeden link. */
    back?: { href: string; label: string }
    /** Pulpit i ekrany główne: znak (i data na pulpicie) zamiast cofania. */
    brand?: ReactNode
    /** Tytuł pokazywany na środku dopiero po przewinięciu (gdy duży tytuł zniknie z ekranu). */
    title?: string
    /** id elementu z dużym tytułem; gdy zniknie z ekranu, wiersz się przykleja. */
    anchorId?: string
    /** Najwyżej dwie ikony akcji (.rk-btn--ghost.rk-btn--icon). */
    actions?: ReactNode
}

// Górny wiersz na telefonie (karta MobileNav, .rk-mtop): bez paska, kotwicą jest tytuł w treści.
export function MobileTop({ back, brand, title, anchorId, actions }: Props) {
    const [stuck, setStuck] = useState(false)

    useEffect(() => {
        if (!anchorId) return
        const anchor = document.getElementById(anchorId)
        if (!anchor) return
        const observer = new IntersectionObserver(([entry]) => {
            setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0)
        })
        observer.observe(anchor)
        return () => observer.disconnect()
    }, [anchorId])

    return (
        <nav
            className={`rk-mtop md:hidden ${stuck ? 'rk-mtop--stuck' : ''}`}
            style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(48px + env(safe-area-inset-top))' }}
            aria-label="Nawigacja ekranu"
        >
            {back && (
                <Link className="rk-mtop__back" href={back.href}>
                    <ChevronLeft />
                    <span>{back.label}</span>
                </Link>
            )}
            {!back && brand}
            {title && <span className="rk-mtop__title" aria-hidden="true">{title}</span>}
            {actions && <div className="rk-mtop__actions">{actions}</div>}
        </nav>
    )
}

/** Znak Rekwizytora w górnym wierszu ekranów głównych; na pulpicie z datą. */
export function MobileBrand({ date }: { date?: string }) {
    return (
        <span className="rk-mtop__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/rekwizytor-znak.svg" alt="Rekwizytor" />
            {date && <span>{date}</span>}
        </span>
    )
}
