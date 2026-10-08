'use client'

import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GroupLabelButtonProps {
    groupId: string
    groupName: string
    locationName?: string
    icon?: string | null
}



export function GroupLabelButton({ groupId, groupName, locationName, icon }: GroupLabelButtonProps) {
    const handleGenerateLabel = (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if inside a link
        e.stopPropagation() // Prevent bubbling
        window.open(`/labels?kind=group&ids=${groupId}`, '_blank')
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleGenerateLabel}
            className="rounded-full"
            title="Drukuj etykietę"
        >
            <QrCode className="w-4 h-4" />
        </Button>
    )
}
