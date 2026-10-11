'use client'

import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { time } from '@/lib/rk-format'

export type SaveStateValue = { pending: boolean; failed?: boolean; at: Date | null }

// Stan zapisu (karta StatusBanner, `.rk-sync`): obok głównego przycisku „Gotowe”, bez osobnego komunikatu.
// Zapisuje się samo, więc przycisk nie zapisuje, tylko zamyka ekran; tu widać, czy wszystko już dotarło.
export function SaveState({ state }: { state: SaveStateValue }) {
    const t = useTranslations('SaveState')
    const wait = state.pending || state.failed
    return (
        <span className={`rk-sync ${wait ? 'rk-sync--wait' : 'rk-sync--ok'}`} role="status" aria-live="polite">
            {state.pending ? <LoaderCircle /> : state.failed ? <TriangleAlert /> : <Check />}
            {state.pending ? t('saving') : state.failed ? t('failed') : state.at ? t('savedAt', { time: time(state.at) }) : t('allSaved')}
        </span>
    )
}
