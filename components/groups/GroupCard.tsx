'use client'
// Force refresh

import { Database } from '@/types/supabase'
import { Folder } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'


type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon' | 'color'> & {
        locations: { name: string } | null
    }

interface GroupCardProps {
    group: Group
    subgroupCount?: number
    onClick?: () => void
    onEdit?: (group: Group) => void
    showLocationAsPrimary?: boolean
    variant?: 'default' | 'compact'
}

export function GroupCard({
    group,
    subgroupCount = 0,
    onClick,
    onEdit,
    showLocationAsPrimary = false,
    colorOverride,
    variant = 'default'
}: GroupCardProps & { colorOverride?: string }) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    const locationName = group.locations?.name || 'Nieprzypisane'

    // Primary and Secondary text logic
    const primaryText = showLocationAsPrimary ? locationName : group.name
    const secondaryText = showLocationAsPrimary ? group.name : null

    // Determine color to use
    // Priority: Override > Group Color > Default Brand Color
    const themeColor = colorOverride || group.color || DEFAULT_GROUP_COLOR
    // For background opacity:
    const bgColor = colorOverride || group.color || DEFAULT_GROUP_COLOR

    const isCompact = variant === 'compact'

    return (
        <div
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClick?.()
                }
            }}
            role="button"
            tabIndex={0}
            className={`group relative flex items-center gap-3 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800 rounded-lg hover:bg-neutral-900/60 transition-all duration-200 cursor-pointer h-full ${isCompact ? 'p-2' : 'p-3'
                }`}
            style={{
                borderColor: colorOverride ? `${colorOverride}33` : undefined // 20% opacity
            }}
        >
            {/* Icon */}
            <div
                className={`shrink-0 rounded-lg transition-colors ${isCompact ? 'p-1.5' : 'p-2'
                    }`}
                style={{
                    backgroundColor: `${bgColor}33`, // ~20% opacity (slightly more visible than 10%)
                    color: themeColor
                }}
            >
                {/* @ts-ignore - Lucide icons type mismatch */}
                <IconComponent
                    className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3
                    className={`font-medium truncate uppercase tracking-wider ${isCompact ? 'text-[9px]' : 'text-sm'
                        }`}
                    style={{ color: showLocationAsPrimary ? themeColor : '#EDEDED' }}
                >
                    {primaryText}
                </h3>

                {secondaryText && (
                    <p className={`truncate font-semibold text-white ${isCompact ? 'text-xs' : 'text-sm'
                        }`}>
                        {secondaryText}
                    </p>
                )}
            </div>

            {/* Subgroup count (if any) */}
            {subgroupCount > 0 && (
                <span className="shrink-0 text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                    {subgroupCount}
                </span>
            )}
        </div>
    )
}

