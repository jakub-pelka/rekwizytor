'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'
import { createClient } from '@/utils/supabase/client'

interface PerformanceLabelButtonProps {
    performanceId: string
    performanceTitle: string
    premiereDate?: string | null
}

export function PerformanceLabelButton({ performanceId, performanceTitle, premiereDate, variant = 'icon' }: PerformanceLabelButtonProps & { variant?: 'icon' | 'menu' }) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateLabel = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if inside a link
        e.stopPropagation() // Prevent bubbling

        try {
            setIsGenerating(true)
            const supabase = createClient()
            const { data } = await supabase
                .from('groups')
                .select('id')
                .eq('performance_id', performanceId)
                .is('deleted_at', null)

            const groupIds = (data ?? []).map(g => g.id)
            if (groupIds.length > 0) {
                window.open(`/labels?kind=group&ids=${groupIds.join(',')}`, '_blank')
            } else {
                notify.error('Brak grup rekwizytów do wydruku dla tego spektaklu')
            }
        } catch {
            notify.error('Błąd otwierania etykiet')
        } finally {
            setIsGenerating(false)
        }
    }

    if (variant === 'menu') {
        return (
            <Button
                onClick={handleGenerateLabel}
                disabled={isGenerating}
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg h-auto"
                isLoading={isGenerating}
                leftIcon={!isGenerating && <QrCode className="w-4 h-4" />}
            >
                Drukuj etykiety
            </Button>
        )
    }

    return (
        <Button
            onClick={handleGenerateLabel}
            disabled={isGenerating}
            variant="ghost"
            size="icon"
            className="rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
            isLoading={isGenerating}
            title="Drukuj etykiety"
        >
            {!isGenerating && <QrCode className="w-4 h-4" />}
        </Button>
    )
}
