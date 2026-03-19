'use client'

import { useState } from 'react'
import { BarChart, Zap, Search, Database as DatabaseIcon, DollarSign, Sparkles, ArrowRightLeft } from 'lucide-react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'

type Log = Database['public']['Tables']['ai_usage_logs']['Row']

type Props = {
    logs: Log[]
    allStats: {
        tokens_input: number | null
        tokens_output: number | null
        operation_type: string
    }[]
    storageStats: {
        category: string
        label: string
        size_bytes: number
    }[]
}


const OPERATION_BADGE_CLASSES: Record<string, string> = {
    fast_add: 'bg-yellow-400/10 text-yellow-400 ring-1 ring-inset ring-yellow-400/20',
    smart_search: 'bg-burgundy-main/10 text-burgundy-light ring-1 ring-inset ring-burgundy-main/20',
}
const DEFAULT_BADGE_CLASS = 'bg-pink-400/10 text-pink-400 ring-1 ring-inset ring-pink-400/20'

function getOperationBadgeClass(operationType: string): string {
    return OPERATION_BADGE_CLASSES[operationType] ?? DEFAULT_BADGE_CLASS
}

export function StatsDashboard({ logs, allStats, storageStats }: Props) {
    const [activeTab, setActiveTab] = useState<'ai' | 'storage'>('ai')
    const [currency, setCurrency] = useState<'USD' | 'PLN'>('USD')
    const EXCHANGE_RATE = 4.15 // Hardcoded for now, could be fetched
    const t = useTranslations('AIStats')

    const OPERATION_LABELS: Record<string, string> = {
        fast_add: t('operations.fastAdd'),
        smart_search: t('operations.smartSearch'),
        generate_description: t('operations.generateDesc'),
        create_item: t('operations.createItem'),
        scan_scenes: t('operations.scanScenes'),
        vision_group: t('operations.visionGroup'),
        vision_props: t('operations.visionProps'),
        mapping_ai: t('operations.mappingAI'),
        query_correction: t('operations.queryCorrection'),
        embedding_indexing: t('operations.embeddingIndexing'),
    }

    const getOperationLabel = (operationType: string): string =>
        OPERATION_LABELS[operationType] ?? operationType

    // Calculate totals
    const totalInput = allStats.reduce((acc, curr) => acc + (curr.tokens_input || 0), 0)
    const totalOutput = allStats.reduce((acc, curr) => acc + (curr.tokens_output || 0), 0)
    const totalTokens = totalInput + totalOutput

    // Calculate cost (Gemini 2.0 Flash pricing)
    // Input: $0.10 / 1M tokens
    // Output: $0.40 / 1M tokens
    const costInputUSD = (totalInput / 1_000_000) * 0.10
    const costOutputUSD = (totalOutput / 1_000_000) * 0.40
    const totalCostUSD = costInputUSD + costOutputUSD

    const totalCost = currency === 'USD' ? totalCostUSD : totalCostUSD * EXCHANGE_RATE

    // Group by operation
    const byType = allStats.reduce((acc, curr) => {
        acc[curr.operation_type] = (acc[curr.operation_type] || 0) + 1
        return acc
    }, {} as Record<string, number>) || {}

    // Group by month for monthly breakdown
    const byMonth = logs.reduce((acc, log) => {
        const month = new Date(log.created_at || '').toISOString().slice(0, 7) // YYYY-MM
        if (!acc[month]) {
            acc[month] = { input: 0, output: 0, total: 0, count: 0 }
        }
        acc[month].input += log.tokens_input || 0
        acc[month].output += log.tokens_output || 0
        acc[month].total += log.total_tokens || 0
        acc[month].count += 1
        return acc
    }, {} as Record<string, { input: number; output: number; total: number; count: number }>)

    // Sort months descending (newest first)
    const monthlyData = Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6) // Show last 6 months



    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center font-boldonse">
                        <BarChart className="mr-3 h-6 w-6 text-ai-secondary" />
                        {t('title')}
                    </h1>
                    <p className="text-neutral-400 text-sm mt-1 font-courier">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800 self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                        AI
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'storage' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Storage
                    </button>
                </div>
            </div>

            {activeTab === 'ai' ? (
                <>
                    {/* Primary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-neutral-400 text-sm font-courier">{t('totalTokens')}</span>
                                <DatabaseIcon className="h-5 w-5 text-ai-secondary" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-2">{totalTokens.toLocaleString()}</div>
                            <div className="text-xs text-neutral-500 font-mono">
                                {t('inOut', { input: totalInput.toLocaleString(), output: totalOutput.toLocaleString() })}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-neutral-400 text-sm font-courier">{t('estimatedCost')}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrency(c => c === 'USD' ? 'PLN' : 'USD')}
                                        className="text-[10px] px-2 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors font-mono"
                                    >
                                        {currency}
                                    </button>
                                    <DollarSign className="h-5 w-5 text-green-400" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-white mb-2">
                                {currency === 'USD' ? '$' : 'PLN '}{totalCost.toFixed(4)}
                            </div>
                            <div className="text-xs text-neutral-500 font-mono">
                                {t('pricingNote')} {currency === 'PLN' && `(~${EXCHANGE_RATE} PLN/USD)`}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Stats - Operations */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('fastAdds')}</span>
                                <Zap className="h-4 w-4 text-yellow-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{byType['fast_add'] || 0}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('itemsProcessed')}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('smartSearches')}</span>
                                <Search className="h-4 w-4 text-burgundy-light" />
                            </div>
                            <div className="text-2xl font-bold text-white">{byType['smart_search'] || 0}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('queriesAnalyzed')}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('generations')}</span>
                                <Sparkles className="h-4 w-4 text-pink-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{byType['generate_description'] || 0}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('descriptionsGenerated')}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('visionAnalysis')}</span>
                                <Sparkles className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{(byType['vision_group'] || 0) + (byType['vision_props'] || 0)}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('imagesAnalyzed')}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('mappingAI')}</span>
                                <DatabaseIcon className="h-4 w-4 text-green-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{byType['mapping_ai'] || 0}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('mapsGenerated')}
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-neutral-400 text-sm">{t('queryCorrection')}</span>
                                <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">{byType['query_correction'] || 0}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {t('queriesCorrected')}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Breakdown */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-base font-medium text-white mb-4 font-boldonse">{t('monthlyBreakdown')}</h3>
                        <div className="space-y-3">
                            {monthlyData.map(([month, data]) => {
                                const costUSD = ((data.input / 1_000_000) * 0.10) + ((data.output / 1_000_000) * 0.40)
                                const cost = currency === 'USD' ? costUSD : costUSD * EXCHANGE_RATE
                                const monthName = new Date(month + '-01').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

                                return (
                                    <div key={month} className="border-b border-neutral-800 pb-3 last:border-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-neutral-300 text-sm font-courier">{monthName}</span>
                                            <span className="text-white font-courier text-sm font-bold">
                                                {currency === 'USD' ? '$' : 'PLN '}{cost.toFixed(4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-neutral-500">
                                            <span>{data.total.toLocaleString()} tokens</span>
                                            <span>{data.count} {t('operationsCount')}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Cost & Usage Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                            <h3 className="text-base font-medium text-white mb-4 font-boldonse">{t('costBreakdown')}</h3>
                            <div className="space-y-4">
                                {Object.entries(byType).map(([type]) => {
                                    const typeLogs = allStats.filter(s => s.operation_type === type)
                                    const typeInput = typeLogs.reduce((acc, curr) => acc + (curr.tokens_input || 0), 0)
                                    const typeOutput = typeLogs.reduce((acc, curr) => acc + (curr.tokens_output || 0), 0)
                                    const typeCostUSD = ((typeInput / 1_000_000) * 0.10) + ((typeOutput / 1_000_000) * 0.40)
                                    const typeCost = currency === 'USD' ? typeCostUSD : typeCostUSD * EXCHANGE_RATE

                                    const label = getOperationLabel(type)

                                    return (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-neutral-400 text-sm font-courier">{label}</span>
                                            <span className="text-white font-courier text-sm">
                                                {currency === 'USD' ? '$' : 'PLN '}{typeCost.toFixed(4)}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                                    <span className="text-neutral-300 text-sm font-bold font-courier">Total</span>
                                    <span className="text-green-400 font-courier text-sm font-bold">
                                        {currency === 'USD' ? '$' : 'PLN '}{totalCost.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                            <h3 className="text-base font-medium text-white mb-4 font-boldonse">{t('avgTokens')}</h3>
                            <div className="space-y-4">
                                {Object.entries(byType).map(([type, count]) => {
                                    const typeLogs = allStats.filter(s => s.operation_type === type)
                                    const totalTokens = typeLogs.reduce((acc, curr) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0)
                                    const avg = count > 0 ? Math.round(totalTokens / count) : 0

                                    const label = getOperationLabel(type)

                                    return (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-neutral-400 text-sm font-courier">{label}</span>
                                            <span className="text-white font-courier text-sm">{avg} tokens</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>



                    {/* Recent Logs Table */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-800">
                            <h3 className="text-lg font-medium text-white">{t('recentOperations')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 font-courier">
                                    <tr>
                                        <th className="px-6 py-3">{t('table.time')}</th>
                                        <th className="px-6 py-3">{t('table.operation')}</th>
                                        <th className="px-6 py-3">{t('table.model')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.inputTokens')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.outputTokens')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 font-courier">
                                    {logs?.map((log) => (
                                        <tr key={log.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4 text-neutral-300">
                                                {new Date(log.created_at || '').toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-sans ${getOperationBadgeClass(log.operation_type)}`}>
                                                    {getOperationLabel(log.operation_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400 text-xs">
                                                {log.model_name}
                                            </td>
                                            <td className="px-6 py-4 text-right text-neutral-300">
                                                {log.tokens_input}
                                            </td>
                                            <td className="px-6 py-4 text-right text-neutral-300">
                                                {log.tokens_output}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-white">
                                                {log.total_tokens}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!logs || logs.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                                {t('noLogs')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-8">
                    {/* Database Storage Section */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <DatabaseIcon className="h-5 w-5 text-ai-secondary" />
                                <div>
                                    <h3 className="text-md font-bold text-white font-boldonse">{t('storage.database')}</h3>
                                    <p className="text-xs text-neutral-500 font-courier">{t('storage.databaseDesc')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-mono text-white block">
                                    {formatBytes(storageStats.filter(s => s.category !== 'storage').reduce((acc, curr) => acc + curr.size_bytes, 0))}
                                    <span className="text-neutral-500"> / 500 MB*</span>
                                </span>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Overall DB Progress */}
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-ai-secondary rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min((storageStats.filter(s => s.category !== 'storage').reduce((acc, curr) => acc + curr.size_bytes, 0) / (500 * 1024 * 1024)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* System Data */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-neutral-400 font-boldonse uppercase tracking-wider">{t('storage.system')}</h4>
                                    <div className="space-y-2">
                                        {storageStats.filter(s => s.category === 'system').map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-neutral-300 font-courier">{t(`storage.${item.label}`)}</span>
                                                <span className="text-neutral-500 font-mono">{formatBytes(item.size_bytes)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* User Data */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-neutral-400 font-boldonse uppercase tracking-wider">{t('storage.user')}</h4>
                                    <div className="space-y-2">
                                        {storageStats.filter(s => s.category === 'user').map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-neutral-300 font-courier">{t(`storage.${item.label}`)}</span>
                                                <span className="text-neutral-500 font-mono">{formatBytes(item.size_bytes)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File Storage Section */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded border-2 border-yellow-500/50 flex items-center justify-center">
                                    <div className="h-2 w-2 bg-yellow-500 rounded-sm" />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-white font-boldonse">{t('storage.files')}</h3>
                                    <p className="text-xs text-neutral-500 font-courier">{t('storage.filesDesc')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-mono text-white block">
                                    {formatBytes(storageStats.filter(s => s.category === 'storage').reduce((acc, curr) => acc + curr.size_bytes, 0))}
                                    <span className="text-neutral-500"> / 1 GB*</span>
                                </span>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Overall Storage Progress */}
                            <div className="space-y-2 mb-6">
                                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min((storageStats.filter(s => s.category === 'storage').reduce((acc, curr) => acc + curr.size_bytes, 0) / (1024 * 1024 * 1024)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                {storageStats.filter(s => s.category === 'storage').map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-neutral-300 font-courier">{t(`storage.${item.label}`)}</span>
                                        <span className="text-neutral-500 font-mono">{formatBytes(item.size_bytes)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 items-start">
                        <div className="mt-0.5">
                            <div className="h-4 w-4 rounded-full border border-blue-400 flex items-center justify-center text-[10px] text-blue-400 font-mono">i</div>
                        </div>
                        <p className="text-xs text-blue-200/80 leading-relaxed font-courier">
                            {t('storage.disclaimer')}
                        </p>
                    </div>
                </div>
            )}

        </div>
    )
}

