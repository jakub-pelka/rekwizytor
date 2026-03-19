'use client'

import React from 'react'
import { PauseCircle, ArrowRight } from 'lucide-react'

type Props = {
    readonly now: number
    readonly breakStartTime: number | null
    readonly formatDuration: (ms: number) => string
    readonly endBreak: () => void
    readonly t: (key: string, params?: any) => string
}

export function LiveBreakOverlay({
    now,
    breakStartTime,
    formatDuration,
    endBreak,
    t
}: Props) {
    return (
        <div className="fixed inset-0 z-200 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <PauseCircle className="w-24 h-24 text-burgundy-main mb-8 animate-pulse" />
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">{t('breakTitle')}</h2>
            <div className="text-6xl font-mono text-white font-black mb-12">
                {formatDuration(now - (breakStartTime || 0))}
            </div>
            <button
                onClick={endBreak}
                className="px-12 py-6 bg-white text-black text-xl font-black rounded-3xl hover:bg-neutral-200 transition-all shadow-2xl active:scale-95 flex items-center gap-4"
            >
                <ArrowRight className="w-8 h-8" /> {t('resumeShow')}
            </button>
        </div>
    )
}
