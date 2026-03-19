'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { LayoutGrid, List, Box } from 'lucide-react'
import { useTranslations } from 'next-intl'

type PerformanceProp = Database['public']['Tables']['performance_props']['Row']

type Props = {
    performanceId: string
    items: PerformanceProp[]
}

export function PerformanceAllItemsView({ performanceId, items }: Props) {
    const t = useTranslations('ProductionDetails')
    const [view, setView] = useState<'grid' | 'list'>('grid')

    // Deduplicate items based on item_name, as one item can be in multiple scenes
    // Actually, in the new performance_props table, each row is unique for the performance.
    const uniqueItemsMap = new Map<string, PerformanceProp>()
    items.forEach(item => {
        if (!uniqueItemsMap.has(item.item_name)) {
            uniqueItemsMap.set(item.item_name, item)
        }
    })
    const uniqueItems = Array.from(uniqueItemsMap.values())

    return (
        <div className="space-y-6">
            <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800 w-fit">
                <button
                    onClick={() => setView('grid')}
                    className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    <List className="w-4 h-4" />
                </button>
            </div>

            {view === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {uniqueItems.map((item) => (
                        <div
                            key={item.id}
                            className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700 block"
                        >
                            <div className="aspect-square w-full bg-neutral-800 relative flex items-center justify-center bg-linear-to-br from-neutral-800 to-neutral-900">
                                <Box className="h-16 w-16 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-white truncate">
                                    {item.item_name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {uniqueItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700"
                        >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-800 flex items-center justify-center">
                                <Box className="h-6 w-6 text-neutral-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">
                                    {item.item_name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {uniqueItems.length === 0 && (
                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                    <p>{t('noProps')}</p>
                </div>
            )}
        </div>
    )
}
