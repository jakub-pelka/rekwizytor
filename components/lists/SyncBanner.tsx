'use client'

import { CircleCheck, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StatusBanner } from '@/components/rk/StatusBanner'
import type { SyncState } from './useListChecks'

// Stan zapisu listy (karta StatusBanner, POMYSLY 8): brak sieci > nieudany zapis > zapisywanie > zapisane.
export function SyncBanner({ sync, onRetry }: { sync: SyncState; onRetry: () => void }) {
    const t = useTranslations('Sync')
    const waiting = sync.pending > 0 && t('pending', { count: sync.pending })

    if (sync.offline) {
        return <StatusBanner tone="offline" icon={<WifiOff />} side={waiting}>{t('offline')}</StatusBanner>
    }
    if (sync.failed) {
        return (
            <StatusBanner tone="offline" icon={<TriangleAlert />} side={<button className="rk-btn rk-btn--ghost rk-btn--sm" onClick={onRetry}>{t('retry')}</button>}>
                {t('failed')}
            </StatusBanner>
        )
    }
    if (sync.syncing) return <StatusBanner tone="sync" icon={<RefreshCw />} side={waiting}>{t('syncing')}</StatusBanner>
    if (sync.saved) return <StatusBanner tone="ok" icon={<CircleCheck />}>{t('saved')}</StatusBanner>
    return null
}
