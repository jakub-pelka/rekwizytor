'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'

// Sezon jako filtr listy spektakli (POMYSLY 11): bieżący sezon albo archiwum poprzednich.
export function SeasonFilter({ seasonLabel, archive }: { seasonLabel: string; archive: boolean }) {
    const t = useTranslations('PerformancesPhone')
    const router = useRouter()
    const pathname = usePathname()

    return (
        <div className="rk-select w-full">
            <select
                aria-label={t('season')}
                value={archive ? 'archive' : 'current'}
                onChange={e => router.replace(e.target.value === 'archive' ? `${pathname}?season=archive` : pathname)}
            >
                <option value="current">{seasonLabel}</option>
                <option value="archive">{t('archive')}</option>
            </select>
            <ChevronDown />
        </div>
    )
}
