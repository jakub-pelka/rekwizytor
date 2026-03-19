'use client'

import React from 'react'
import { clsx } from 'clsx'
import { CheckCircle2 } from 'lucide-react'

type Checklist = {
    id: string
    act_number: number
    scene_number: number
    scene_name: string | null
    is_active: boolean | null
}

type ChecklistItem = {
    id: string
    scene_checklist_id: string
    is_prepared: boolean | null
}

type Props = {
    readonly sortedChecklists: Checklist[]
    readonly items: ChecklistItem[]
    readonly localActiveSceneId: string
    readonly setLocalActiveSceneId: (id: string) => void
    readonly t: (key: string, params?: any) => string
}

export function LivePerformanceSidebar({
    sortedChecklists,
    items,
    localActiveSceneId,
    setLocalActiveSceneId,
    t
}: Props) {
    return (
        <div className="hidden md:flex w-72 flex-col bg-neutral-950 border-r border-neutral-900 overflow-y-auto">
            <div className="p-6 border-b border-neutral-900">
                <h2 className="text-lg font-black uppercase tracking-tighter text-neutral-400">{t('scenes')}</h2>
            </div>
            {sortedChecklists.map((c, i) => {
                const sceneItems = items.filter(item => item.scene_checklist_id === c.id)
                const isDone = sceneItems.length > 0 && sceneItems.every(item => item.is_prepared)
                const prevC = sortedChecklists[i - 1]
                const isActChange = i === 0 || (prevC && prevC.act_number !== c.act_number)

                return (
                    <React.Fragment key={c.id}>
                        {isActChange && (
                            <div className="px-6 py-4 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">
                                {Number(c.act_number) === 0 ? t('preparation') : t('act', { number: c.act_number })}
                            </div>
                        )}
                        <button
                            onClick={() => setLocalActiveSceneId(c.id)}
                            className={clsx(
                                "w-full px-6 py-4 text-left transition-all border-l-4 font-medium",
                                localActiveSceneId === c.id
                                    ? "bg-burgundy-main/10 border-burgundy-main text-white"
                                    : "border-transparent text-neutral-500 hover:bg-neutral-900"
                            )}
                        >
                            <div className="flex justify-between items-center">
                                <span className="truncate">
                                    {Number(c.scene_number) === 0 ? t('preparation') : `${t('scene', { number: c.scene_number })} ${c.scene_name || ''}`}
                                </span>
                                {isDone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>
                        </button>
                    </React.Fragment>
                )
            })}
        </div>
    )
}
