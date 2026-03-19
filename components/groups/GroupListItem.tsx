'use client'

import { Database } from '@/types/supabase'
import { Folder, ChevronRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'


type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon' | 'color'> & {
        locations: { name: string } | null
    }

interface GroupListItemProps {
    readonly group: Group
    readonly subgroupCount?: number
    readonly onClick?: () => void
    readonly onEdit?: (group: Group) => void
}

export function GroupListItem({ group, subgroupCount = 0, onClick, onEdit }: GroupListItemProps) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    const themeColor = group.color || '#A0232F'

    return (
        <>
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
                className="group relative flex items-center gap-4 px-4 py-3 bg-neutral-900/20 hover:bg-neutral-800/50 border-b border-neutral-800 last:border-b-0 transition-colors cursor-pointer"
            >
                {/* Icon */}
                <div
                    className="shrink-0 p-2 rounded-lg transition-colors"
                    style={{
                        backgroundColor: `${themeColor}33`,
                        color: themeColor
                    }}
                >
                    {/* @ts-ignore - Lucide icons type mismatch */}
                    <IconComponent className="w-5 h-5" />
                </div>

                {/* Name */}
                <div className="grow min-w-0">
                    <h3 className="font-medium text-neutral-200 group-hover:text-white truncate transition-colors">
                        {group.name}
                    </h3>
                </div>

                {/* Subgroups Badge */}
                {subgroupCount > 0 && (
                    <span className="shrink-0 text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                        {subgroupCount} {subgroupCount === 1 ? 'podgrupa' : 'podgrup'}
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />
                </div>
            </div>
        </>
    )
}
