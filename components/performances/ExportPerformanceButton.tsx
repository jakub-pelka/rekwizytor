'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Database } from '@/types/supabase'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

type Performance = Database['public']['Tables']['performances']['Row']
type PerformanceProp = Database['public']['Tables']['performance_props']['Row']
type Note = Database['public']['Tables']['notes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type SceneTask = Database['public']['Tables']['scene_tasks']['Row']
type User = {
    full_name: string | null
    email: string | undefined
}

interface ExportPerformanceButtonProps {
    readonly production: Performance
    readonly items: PerformanceProp[]
    readonly scenes?: Scene[]
    readonly notes?: Note[]
    readonly tasks?: SceneTask[]
    readonly user: User | null
    readonly variant?: 'default' | 'menu'
}

export function ExportPerformanceButton({ production, items, scenes = [], notes = [], tasks = [], user, variant = 'default' }: ExportPerformanceButtonProps) {
    const t = useTranslations('ExportButton') // Reusing existing translations or we might need new ones
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPDF = async () => {
        const exportPromise = (async () => {
            const response = await fetch('/api/generate-performance-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ production, items, scenes, notes, tasks, user }),
            })

            if (!response.ok) throw new Error('Failed to generate PDF')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const safeTitle = production.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            a.download = `${safeTitle}_export_${format(new Date(), 'yyyy-MM-dd')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        })()

        setIsExporting(true)
        notify.promise(exportPromise, {
            loading: 'Generowanie PDF...',
            success: 'PDF wygenerowany!',
            error: 'Błąd generowania PDF'
        }, 'pdf').finally(() => setIsExporting(false))
    }

    if (variant === 'menu') {
        return (
            <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg mt-1"
                isLoading={isExporting}
                leftIcon={!isExporting && <FileText className="w-4 h-4" />}
            >
                Eksportuj PDF
            </Button>
        )
    }

    return (
        <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white"
            isLoading={isExporting}
            leftIcon={!isExporting && <FileText className="w-4 h-4" />}
        >
            Eksportuj PDF
        </Button>
    )
}
