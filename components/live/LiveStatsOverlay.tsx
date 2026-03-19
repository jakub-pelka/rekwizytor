'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

type Props = {
    readonly startTime: number | null
    readonly endTime: number | null
    readonly totalBreakTime: number
    readonly formatDuration: (ms: number) => string
    readonly onExit: () => void
    readonly t: (key: string, params?: any) => string
}

export function LiveStatsOverlay({
    startTime,
    endTime,
    totalBreakTime,
    formatDuration,
    onExit,
    t
}: Props) {
    const totalDuration = endTime && startTime ? endTime - startTime - totalBreakTime : 0

    return (
        <div className="fixed inset-0 z-200 bg-black flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-md w-full">
                <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-white text-center mb-2">{t('perfFinished')}</h2>
                <p className="text-neutral-400 text-center mb-8">{t('wellDone')}</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">{t('totalTime')}</span>
                        <span className="text-xl font-mono text-white font-bold">{formatDuration(totalDuration)}</span>
                    </div>
                    <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">{t('totalBreaks')}</span>
                        <span className="text-xl font-mono text-white font-bold">{formatDuration(totalBreakTime)}</span>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all shadow-lg"
                >
                    {t('exitOverview')}
                </button>
            </div>
        </div>
    )
}
