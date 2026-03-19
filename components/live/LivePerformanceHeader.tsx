'use client'

import React from 'react'

type Props = {
    readonly currentChecklist?: {
        readonly scene_number: number
        readonly scene_name: string | null
    }
    readonly now: number
    readonly startTime: number | null
    readonly totalBreakTime: number
    readonly isBreak: boolean
    readonly breakStartTime: number | null
    readonly formatDuration: (ms: number) => string
    readonly t: (key: string, params?: any) => string
}

export function LivePerformanceHeader({
    currentChecklist,
    now,
    startTime,
    totalBreakTime,
    isBreak,
    breakStartTime,
    formatDuration,
    t
}: Props) {
    const elapsed = now - (startTime || 0) - totalBreakTime - (isBreak && breakStartTime ? now - breakStartTime : 0)

    return (
        <div className="h-20 border-b border-neutral-900/50 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md shrink-0 z-30">
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-widest text-burgundy-light leading-none mb-1">{t('currentScene')}</span>
                    <h1 className="text-xl font-black text-white uppercase tracking-tighter truncate">
                        {Number(currentChecklist?.scene_number) === 0
                            ? t('preparation')
                            : `${t('scene', { number: currentChecklist?.scene_number || '?' })} ${currentChecklist?.scene_name || ''}`}
                    </h1>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500 leading-none mb-1">{t('showTime')}</span>
                <div className="text-2xl font-mono text-white font-black">{formatDuration(elapsed)}</div>
            </div>
        </div>
    )
}
