'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GROUP_STATUS, GroupStatusBadge, GroupStatusIcon } from '@/components/rk/GroupStatus'
import type { GroupStatus } from '@/lib/performance-structure'

export type BlockingItem = {
    id: string
    name: string
    status: Exclude<GroupStatus, 'available'>
    statusNote: string | null
    from: string | null
    code: string
}

/** Ile elementów blokujących gotowość pokazujemy od razu; resztę rozwija się jednym kliknięciem. */
const VISIBLE = 2

// „Blokuje gotowość” na pulpicie: domyślnie dwa pierwsze, reszta po „Pokaż wszystkie”.
export function BlockingList({ items }: { items: BlockingItem[] }) {
    const t = useTranslations('DashboardB')
    const [all, setAll] = useState(false)
    const shown = all ? items : items.slice(0, VISIBLE)
    const hidden = items.length - VISIBLE

    return (
        <div className="flex flex-col gap-3">
            {/* Nagłówek i „Pokaż wszystkie” w jednym wierszu: lista nie zabiera osobnego rzędu na przełącznik. */}
            <div className="flex items-baseline justify-between gap-3">
                <span className="pl-count">{t('blocking', { count: items.length })}</span>
                {hidden > 0 && (
                    <button type="button" className="pl-link" aria-expanded={all} onClick={() => setAll(a => !a)}>
                        {all ? t('blockingLess') : t('blockingMore', { count: items.length })}
                        {all ? <ChevronUp /> : <ChevronDown />}
                    </button>
                )}
            </div>
            <ul className="pl-list pl-list--media">
                {shown.map(p => (
                    <li key={p.id}>
                        <GroupStatusIcon status={p.status} />
                        <span className="pl-main">
                            <b>{p.name}</b>
                            <small>
                                <span className="md:hidden">{[GROUP_STATUS[p.status].label, p.statusNote].filter(Boolean).join(' · ')}</span>
                                <span className="hidden md:inline">{[p.from, p.statusNote, p.code].filter(Boolean).join(' · ')}</span>
                            </small>
                        </span>
                        <span className="hidden md:inline-flex"><GroupStatusBadge status={p.status} /></span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
