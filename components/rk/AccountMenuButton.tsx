'use client'

import { useState } from 'react'
import { CircleUserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MobileMenu } from '@/components/layout/MobileMenu'

// Konto w górnym wierszu pulpitu (karta MobileNav): notatki, wyszukiwanie, ustawienia, wylogowanie.
export function AccountMenuButton() {
    const t = useTranslations('Navigation')
    const [open, setOpen] = useState(false)

    return (
        <>
            <button className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('more')} onClick={() => setOpen(true)}>
                <CircleUserRound />
            </button>
            <MobileMenu isOpen={open} onClose={() => setOpen(false)} />
        </>
    )
}
