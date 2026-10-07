import { CircleX, TriangleAlert } from 'lucide-react'
import type { GroupStatus } from '@/lib/performance-structure'

// Stan rzeczy w magazynie (karta Badge): warning z trójkątem, danger z krzyżykiem w kółku.
// Status zawsze ma słowo; „na miejscu” nie pokazujemy, bo to stan domyślny.
export const GROUP_STATUS: Record<Exclude<GroupStatus, 'available'>, { label: string; tone: 'warning' | 'danger' }> = {
    in_repair: { label: 'Do naprawy', tone: 'warning' },
    loaned: { label: 'Wypożyczony', tone: 'warning' },
    missing: { label: 'Zaginiony', tone: 'danger' },
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
    if (status === 'available') return null
    const { label, tone } = GROUP_STATUS[status]
    return <span className={`rk-badge rk-badge--${tone}`}>{label}</span>
}

/** Ikona stanu w wierszu „Blokuje gotowość” (.pl-ico). */
export function GroupStatusIcon({ status }: { status: GroupStatus }) {
    if (status === 'available') return null
    const { tone } = GROUP_STATUS[status]
    return <span className={`pl-ico pl-ico--${tone}`}>{tone === 'danger' ? <CircleX /> : <TriangleAlert />}</span>
}
