'use client'

import React from 'react'
import { CheckCircle2, Circle, User, Box } from 'lucide-react'
import NextImage from 'next/image'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

type ChecklistItem = {
    id: string
    scene_checklist_id: string
    item_id: string
    is_prepared: boolean | null
    live_notes: string | null
    item_name_snapshot: string | null
    item_image_url_snapshot: string | null
    performance_prop_id: string | null
    assigned_to: string | null
}

type Props = {
    readonly item: ChecklistItem
    readonly profiles: readonly { readonly id: string, readonly full_name: string | null, readonly avatar_url: string | null }[]
    readonly forceStageAll: boolean
    readonly onTogglePrepared: (id: string, current: boolean | null) => void
    readonly onAssign: (itemId: string, userId: string) => void
    readonly onSafeVibrate: () => void
}

function ChecklistAvatar({
    assignedTo,
    profiles,
    onAssign,
    t
}: {
    readonly assignedTo: string | null
    readonly profiles: Props['profiles']
    readonly onAssign: Props['onAssign']
    readonly t: any
}) {
    const profile = profiles.find(p => p.id === assignedTo)

    return (
        <div className="relative mr-4 shrink-0">
            <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                value={assignedTo || ''}
                onChange={(e) => onAssign(e.target.value, e.target.value)}
            >
                <option value="">{t('unassigned')}</option>
                {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || 'User'}</option>
                ))}
            </select>
            <div className={clsx(
                "h-8 w-8 rounded-full flex items-center justify-center border transition-colors overflow-hidden",
                assignedTo ? "border-neutral-600 bg-neutral-800" : "border-dashed border-neutral-700 bg-transparent text-neutral-600"
            )}>
                {(() => {
                    if (profile?.avatar_url) {
                        return <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                    }
                    if (assignedTo) {
                        return <span className="text-xs font-bold text-white">{profile?.full_name?.[0] || '?'}</span>
                    }
                    return <User className="h-4 w-4" />
                })()}
            </div>
        </div>
    )
}

function ChecklistActionButtons({
    item,
    onTogglePrepared,
    onSafeVibrate,
    t
}: {
    readonly item: ChecklistItem
    readonly onTogglePrepared: Props['onTogglePrepared']
    readonly onSafeVibrate: Props['onSafeVibrate']
    readonly t: any
}) {
    return (
        <div className="flex items-center gap-2 shrink-0">
            <button
                onClick={() => {
                    onSafeVibrate()
                    onTogglePrepared(item.id, item.is_prepared)
                }}
                className={clsx(
                    "flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 transition-all active:scale-95 touch-manipulation",
                    item.is_prepared
                        ? "bg-burgundy-main/20 border-burgundy-main text-burgundy-light shadow-[0_0_15px_rgba(160,35,47,0.3)]"
                        : "bg-neutral-950 border-neutral-700 text-neutral-600 hover:border-neutral-500"
                )}
            >
                {item.is_prepared ? <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" /> : <Circle className="h-6 w-6 sm:h-8 sm:w-8" />}
                <span className="text-[9px] sm:text-[10px] font-bold mt-1 uppercase tracking-wider">{t('ready')}</span>
            </button>
        </div>
    )
}

export function LiveChecklistItem({
    item,
    profiles,
    forceStageAll,
    onTogglePrepared,
    onAssign,
    onSafeVibrate
}: Props) {
    const t = useTranslations('LivePerformance')

    const containerClasses = clsx(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
        forceStageAll && !item.is_prepared ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" : "",
        item.is_prepared
            ? "bg-burgundy-main/20 border-burgundy-main/50"
            : "bg-neutral-900/50 border-neutral-800"
    )

    return (
        <div id={`item-${item.id}`} className={containerClasses}>
            <div className="flex items-center flex-1 min-w-0 mr-3">
                <div className="h-12 w-12 shrink-0 relative bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center mr-4">
                    {item.item_image_url_snapshot ? (
                        <NextImage
                            src={item.item_image_url_snapshot}
                            alt={item.item_name_snapshot || ''}
                            fill
                            className="object-cover"
                            sizes="48px"
                        />
                    ) : (
                        <Box className="h-6 w-6 text-neutral-600" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className={clsx(
                        "text-base font-medium wrap-break-word whitespace-normal leading-tight",
                        item.is_prepared ? "text-burgundy-light" : "text-white"
                    )}>
                        {item.item_name_snapshot || t('unknownItem')}
                    </h4>
                    {item.live_notes && (
                        <p className="text-xs text-yellow-500 mt-1 wrap-break-word whitespace-normal">
                            {t('note', { note: item.live_notes })}
                        </p>
                    )}
                </div>
            </div>

            <ChecklistAvatar
                assignedTo={item.assigned_to}
                profiles={profiles}
                onAssign={(val) => onAssign(item.id, val)}
                t={t}
            />

            <ChecklistActionButtons
                item={item}
                onTogglePrepared={onTogglePrepared}
                onSafeVibrate={onSafeVibrate}
                t={t}
            />
        </div>
    )
}
