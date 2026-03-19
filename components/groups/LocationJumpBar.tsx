'use client'

import { MapPin } from 'lucide-react'

interface LocationItem {
    name: string
    count: number
}

interface LocationJumpBarProps {
    readonly locations: LocationItem[]
    readonly activeLocation?: string
    readonly onLocationClick: (locationName: string) => void
}

export function LocationJumpBar({ locations, activeLocation, onLocationClick }: LocationJumpBarProps) {
    if (locations.length <= 1) return null

    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
            {locations.map(({ name, count }) => (
                <button
                    key={name}
                    onClick={() => onLocationClick(name)}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                        whitespace-nowrap shrink-0 transition-all duration-200
                        ${activeLocation === name
                            ? 'bg-white text-black'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                        }
                    `}
                >
                    <span>{name}</span>
                    <span className={`
                        text-xs px-1.5 py-0.5 rounded-full
                        ${activeLocation === name
                            ? 'bg-black/20 text-black'
                            : 'bg-neutral-700 text-neutral-400'
                        }
                    `}>
                        {count}
                    </span>
                </button>
            ))}
        </div>
    )
}
