'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'
import { SelectGroupDialog } from './SelectGroupDialog'
import { MapPin, Trash2 } from 'lucide-react'

// Helper type for JSON compatibility (adjusting to allow optional properties)
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

interface Pin {
    id: string
    x: number
    y: number
    group_id: string
    group_name?: string // Optional for display
}

interface SvgMapViewerProps {
    locationId: string
    svgContent: string
    initialPins: Pin[]
}

export function SvgMapViewer({ locationId, svgContent, initialPins }: SvgMapViewerProps) {
    const [pins, setPins] = useState<Pin[]>(initialPins)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [pendingPin, setPendingPin] = useState<{ x: number, y: number } | null>(null)
    const t = useTranslations('Notifications')

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent adding pins if clicking on an existing pin (event bubbling handled by pin onClick)
        if ((e.target as HTMLElement).closest('.map-pin')) return;

        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setPendingPin({ x, y })
        setIsDialogOpen(true)
    }

    const handleGroupSelect = async (groupId: string, groupName: string) => {
        if (!pendingPin) return

        const newPin: Pin = {
            id: crypto.randomUUID(),
            x: pendingPin.x,
            y: pendingPin.y,
            group_id: groupId,
            group_name: groupName
        }

        const updatedPins = [...pins, newPin]
        setPins(updatedPins)
        setIsDialogOpen(false)
        setPendingPin(null)

        // Note: pins_data column has been removed from the database
        // Pin data is now managed differently
        notify.success(t('pinGroupSuccess'))
    }

    const removePin = async (pinId: string) => {
        const updatedPins = pins.filter(p => p.id !== pinId)
        setPins(updatedPins)

        // Note: pins_data column has been removed from the database
        // Pin data is now managed differently
    }

    return (
        <div className="relative w-full h-[600px] bg-white rounded-lg overflow-hidden border border-neutral-800">
            {/* SVG Container */}
            <div
                className="w-full h-full cursor-crosshair"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                onClick={handleMapClick}
            />

            {/* Pins Overlay */}
            {pins.map(pin => (
                <div
                    key={pin.id}
                    className="map-pin absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                    <div className="relative">
                        <MapPin className="w-6 h-6 text-red-600 fill-red-600 drop-shadow-md hover:scale-125 transition-transform" />

                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {pin.group_name || 'Grupa'}
                        </div>

                        {/* Context Actions (simple hover for now) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Czy usunąć ten pin?')) removePin(pin.id);
                            }}
                            className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-neutral-100"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}

            <SelectGroupDialog
                locationId={locationId}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSelect={handleGroupSelect}
            />

            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
                Kliknij na mapę, aby przypiąć grupę.
            </div>
        </div>
    )
}
