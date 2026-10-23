import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { StatusBanner } from '@/components/rk/StatusBanner'
import type { AIBudgetStatus } from '@/utils/ai/budget'

// Pasek na Pulpicie dla kierownika pracowni: zużycie limitu AI teatru od 70% (pkt 27 w PYTANIA.md). Bez maili i powiadomień.
export async function AiLimitBanner({ status }: { status: AIBudgetStatus }) {
    if (status.level === 'ok') return null
    const t = await getTranslations('AiLimit')
    const money = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'USD' }).format(n)
    const exceeded = status.level === 'exceeded'

    return (
        <div className="mx-auto w-full max-w-[1184px] px-4 pt-4 md:px-12 md:pt-8">
            <StatusBanner tone={exceeded ? 'error' : 'pending'} icon={<Sparkles />}>
                {t(exceeded ? 'exceeded' : 'warn', {
                    percent: Math.floor(status.ratio * 100),
                    spent: money(status.spentUsd),
                    budget: money(status.budgetUsd),
                })}
            </StatusBanner>
        </div>
    )
}
