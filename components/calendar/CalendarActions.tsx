'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TermDialog } from './TermDialog'

export type CalendarActionsProps = {
    performances: { id: string; title: string }[]
    canEdit?: boolean
}

// Przyciski nagłówka kalendarza (karta Button: „2 akcje = primary i jeden secondary”):
// secondary „+ Próba” i primary „+ Spektakl”.
export function CalendarActions({ performances, canEdit }: CalendarActionsProps) {
    const t = useTranslations('Terms')
    const [openKind, setOpenKind] = useState<'show' | 'rehearsal' | null>(null)

    if (!canEdit) return null

    return (
        <>
            <div className="rk-btn-group flex items-center">
                <Button
                    variant="secondary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setOpenKind('rehearsal')}
                >
                    {t('actionRehearsal')}
                </Button>
                <Button
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setOpenKind('show')}
                >
                    {t('actionShow')}
                </Button>
            </div>
            {openKind && (
                <TermDialog
                    mode="create"
                    initialKind={openKind}
                    performances={performances}
                    onClose={() => setOpenKind(null)}
                />
            )}
        </>
    )
}
