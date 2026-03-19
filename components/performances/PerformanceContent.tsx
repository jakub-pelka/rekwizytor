'use client'

import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { Layers, Maximize2 } from 'lucide-react'
import { PerformanceSceneView } from './PerformanceSceneView'
import Link from 'next/link'

type Prop = Database['public']['Tables']['performance_props']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

type Props = {
    readonly performanceId: string
    readonly propsByAct: Record<number, Prop[]>
    readonly scenes: Scene[]
    readonly sceneNote: any | null
}

export function PerformanceContent({ performanceId, propsByAct, scenes, sceneNote }: Props) {
    const t = useTranslations('ProductionDetails')

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/80 shrink-0">
                <h3 className="font-bold text-white font-sans text-base leading-none flex items-center gap-2 uppercase tracking-wider opacity-90 pl-1">
                    <Layers className="w-4 h-4 text-neutral-400" />
                    {t('sceneBreakdown')}
                </h3>

                <Link
                    href={`/performances/${performanceId}/tasks`}
                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                    title={t('fullScreen')}
                >
                    <Maximize2 className="w-4 h-4" />
                </Link>
            </div>

            <div className="flex-1 p-0 overflow-hidden">
                <PerformanceSceneView
                    performanceId={performanceId}
                    propsByAct={propsByAct}
                    scenes={scenes}
                    sceneNote={sceneNote}
                />
            </div>
        </div>
    )
}
