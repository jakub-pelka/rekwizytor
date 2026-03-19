'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, Circle, Box } from 'lucide-react'
import NextImage from 'next/image'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

type ChecklistItem = {
    id: string
    is_prepared: boolean | null
    live_notes: string | null
    item_name_snapshot: string | null
    item_image_url_snapshot: string | null
    performance_prop_id: string | null
}

type Props = {
    initialItems: ChecklistItem[]
}

export function LiveChecklist({ initialItems }: Props) {
    const t = useTranslations('LiveChecklist')
    const [items, setItems] = useState<ChecklistItem[]>(initialItems)
    const supabase = createClient()

    const togglePrepared = async (id: string, currentState: boolean | null) => {
        const newState = !currentState

        // Optimistic update
        setItems(items.map(item =>
            item.id === id ? { ...item, is_prepared: newState } : item
        ))

        try {
            const { error } = await supabase
                .from('scene_checklist_items')
                .update({ is_prepared: newState })
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error updating prepared status:', error)
            // Revert on error
            setItems(items.map(item =>
                item.id === id ? { ...item, is_prepared: currentState } : item
            ))
        }
    }


    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    className={clsx(
                        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                        item.is_prepared
                            ? "bg-green-900/20 border-green-900/50"
                            : "bg-neutral-900/50 border-neutral-800"
                    )}
                >
                    <div className="flex items-center flex-1 min-w-0">
                        {/* Item Image/Icon */}
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

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 mr-4">
                            <h4 className={clsx(
                                "text-base font-medium truncate",
                                item.is_prepared ? "text-green-400" : "text-white"
                            )}>
                                {item.item_name_snapshot || t('unknownItem')}
                            </h4>
                            {item.live_notes && (
                                <p className="text-xs text-yellow-500 mt-0.5 truncate">
                                    {t('note', { note: item.live_notes })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Prepared Toggle */}
                        <button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(50)
                                togglePrepared(item.id, item.is_prepared)
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
                </div>
            ))}

            {items.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                    {t('noItems')}
                </div>
            )}
        </div>
    )
}
