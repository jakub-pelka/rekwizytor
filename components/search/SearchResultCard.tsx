'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // Added
import { clsx } from 'clsx'
import {
    Box,
    Layers,
    MapPin,
    StickyNote,
    FileText,
    Tag,
    ClipboardList,
    Calendar,
    Play,
    Download,
    QrCode,
    ExternalLink,
    List,
    Pencil,
    Share2,
    Sparkles,
    MoreHorizontal,
    FolderTree
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { SearchResult } from '@/app/actions/unified-search'
import { notify } from '@/utils/notify'
import { rasterizeIcon } from '@/utils/icon-rasterizer'
import { useTranslations } from 'next-intl'
import { ScheduleShowDialog } from '@/components/performances/ScheduleShowDialog'
import { DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'

// --- Helper Functions (moved from page.tsx to be self-contained) ---

type QuickAction = {
    id: string
    label: string
    shortLabel: string
    icon: React.ComponentType<{ className?: string }>
    getUrl?: (item: SearchResult) => string
    handler?: (item: SearchResult) => void
    isLive?: boolean
    color?: string
}

export const getEntityConfig = (item: SearchResult | { entity_type: string }) => {
    const type = item.entity_type
    switch (type) {
        case 'performance':
            return {
                icon: Layers,
                label: 'Productions',
                colorClass: 'text-purple-400',
                bgClass: 'bg-purple-400/10',
                borderClass: 'border-purple-400/20',
                hoverBorder: 'group-hover:border-purple-400/50'
            }
        case 'group':
            return {
                icon: FolderTree,
                label: 'Groups',
                colorClass: 'text-white',
                bgClass: 'bg-white/10',
                borderClass: 'border-white/20',
                hoverBorder: 'group-hover:border-white/50'
            }
        case 'location':
            return {
                icon: MapPin,
                label: 'Locations',
                colorClass: 'text-orange-400',
                bgClass: 'bg-orange-400/10',
                borderClass: 'border-orange-400/20',
                hoverBorder: 'group-hover:border-orange-400/50'
            }
        case 'note':
            return {
                icon: StickyNote,
                label: 'Notes',
                colorClass: 'text-amber-400',
                bgClass: 'bg-amber-400/10',
                borderClass: 'border-amber-400/20',
                hoverBorder: 'group-hover:border-amber-400/50'
            }
        default:
            return {
                icon: FileText,
                label: 'Other',
                colorClass: 'text-neutral-400',
                bgClass: 'bg-neutral-800',
                borderClass: 'border-neutral-700',
                hoverBorder: 'group-hover:border-neutral-500'
            }
    }
}

const getEntityUrl = (item: SearchResult): string => {
    switch (item.entity_type) {
        case 'performance':
            return `/performances/${item.id}`
        case 'group':
            return `/groups?viewGroup=${item.id}`
        case 'location':
            return `/groups?jumpToLocation=${encodeURIComponent(item.name)}` // Navigate to groups list and scroll to location
        case 'note':
            return `/notes/${item.id}`
        default:
            return '#'
    }
}

const getEntityActions = (item: SearchResult, t: any, onOpenSchedule?: (performanceId: string, color: string | null) => void): QuickAction[] => {
    switch (item.entity_type) {
        case 'performance':
            return [
                {
                    id: 'open-new-tab',
                    label: 'Otwórz w nowej karcie',
                    shortLabel: 'Nowa karta',
                    icon: ExternalLink,
                    handler: (i) => {
                        window.open(`/performances/${i.id}`, '_blank')
                    }
                },
                {
                    id: 'schedule',
                    label: 'Planuj daty',
                    shortLabel: 'Daty',
                    icon: Calendar,
                    handler: (i) => {
                        onOpenSchedule?.(i.id, i.metadata?.color || null)
                    }
                },
                {
                    id: 'live',
                    label: 'Widok Live',
                    shortLabel: 'Live',
                    icon: Play,
                    getUrl: (i) => `/performances/${i.id}/live`,
                    isLive: true
                }
            ]
        case 'group':
            return [
                {
                    id: 'open-new-tab',
                    label: 'Otwórz w nowej karcie',
                    shortLabel: 'Nowa karta',
                    icon: ExternalLink,
                    handler: (i) => {
                        window.open(`/groups?viewGroup=${i.id}`, '_blank')
                    }
                },
                {
                    id: 'edit',
                    label: 'Edytuj grupę',
                    shortLabel: 'Edytuj',
                    icon: Pencil,
                    getUrl: (i) => `/groups?editGroup=${i.id}`
                },
                {
                    id: 'labels',
                    label: 'Generuj etykietę',
                    shortLabel: 'Etykieta',
                    icon: QrCode,
                    handler: async (i) => {
                        const generatePromise = (async () => {
                            const response = await fetch('/api/generate-labels', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    groups: [{
                                        id: i.id,
                                        name: i.name,
                                        locationName: i.metadata?.location_name,
                                        iconImage: await rasterizeIcon(i.metadata?.icon || 'Folder', i.metadata?.color || '#000000')
                                    }]
                                })
                            })
                            if (!response.ok) throw new Error('Label generation failed')
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `etykieta_${i.name.replaceAll(/[^a-z0-9]/gi, '_')}.pdf`
                            a.click()
                        })()

                        notify.promise(generatePromise, {
                            loading: 'Generowanie etykiety...',
                            success: 'Etykieta wygenerowana!',
                            error: 'Błąd generowania etykiety'
                        }, 'pdf')
                    },
                }
            ]
        case 'location':
            return [
                {
                    id: 'open-new-tab',
                    label: 'Otwórz w nowej karcie',
                    shortLabel: 'Nowa karta',
                    icon: ExternalLink,
                    handler: (i) => {
                        window.open(`/groups?jumpToLocation=${encodeURIComponent(i.name)}`, '_blank')
                    }
                },
                {
                    id: 'edit',
                    label: 'Zarządzaj grupami',
                    shortLabel: 'Zarządzaj',
                    icon: Pencil,
                    getUrl: (i) => `/groups/manage?location=${i.id}`
                }
            ]
        case 'note':
            return [
                {
                    id: 'open-new-tab',
                    label: 'Otwórz w nowej karcie',
                    shortLabel: 'Nowa karta',
                    icon: ExternalLink,
                    handler: (i) => {
                        window.open(`/notes/${i.id}`, '_blank')
                    }
                },
                {
                    id: 'edit',
                    label: 'Edytuj notatkę',
                    shortLabel: 'Edytuj',
                    icon: Pencil,
                    getUrl: (i) => `/notes/${i.id}?edit=true`
                },
                {
                    id: 'share',
                    label: 'Udostępnij link',
                    shortLabel: 'Udostępnij',
                    icon: Share2,
                    handler: (i) => {
                        const url = `${window.location.origin}/notes/${i.id}`
                        navigator.clipboard.writeText(url)
                        notify.success('Link skopiowany do schowka')
                    }
                }
            ]
        default:
            return []
    }
}

const extractTextFromTipTap = (json: any): string => {
    if (!json) return ''
    if (typeof json === 'string') {
        try {
            const parsed = JSON.parse(json)
            return extractTextFromTipTap(parsed)
        } catch {
            return json
        }
    }
    if (Array.isArray(json)) {
        return json.map(extractTextFromTipTap).join(' ')
    }
    if (json.type === 'text' && json.text) {
        return json.text
    }
    if (json.content) {
        return extractTextFromTipTap(json.content)
    }
    return ''
}

// --- Main Component ---

interface SearchResultCardProps {
    readonly item: SearchResult & { readonly explanation?: string } // Add explanation type
    readonly aiMode?: boolean
    readonly onClose?: () => void // Callback to close search modal
}

export function SearchResultCard({ item, aiMode, onClose }: SearchResultCardProps) {
    const router = useRouter()
    const [actionsVisible, setActionsVisible] = React.useState(false) // Toggle state for mobile
    const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false)
    const [schedulePerformanceId, setSchedulePerformanceId] = React.useState<string | null>(null)
    const [schedulePerformanceColor, setSchedulePerformanceColor] = React.useState<string | null>(null)
    const t = useTranslations('toast')

    const itemConfig = getEntityConfig(item)
    const ItemIcon = itemConfig.icon

    // Prefer explanation in description if available
    const descriptionText = item.explanation || item.description

    const description = item.entity_type === 'note' && !item.explanation
        ? extractTextFromTipTap(item.description)
        : descriptionText

    // Fix URL for items and groups
    let itemUrl = ''
    if (item.entity_type === 'group') {
        itemUrl = `/groups?viewGroup=${item.id}`
    } else {
        itemUrl = item.url || '#'
    }

    // Validate URL and log warning if invalid
    if (!itemUrl || itemUrl === '#') {
        console.warn('Missing or invalid URL for search result:', item)
    }

    const itemColor = item.entity_type === 'performance' && item.metadata?.color
        ? item.metadata.color
        : undefined

    const handleOpenSchedule = (performanceId: string, color: string | null) => {
        setSchedulePerformanceId(performanceId)
        setSchedulePerformanceColor(color)
        setScheduleDialogOpen(true)
    }

    const actions = getEntityActions(item, t, handleOpenSchedule)

    const handleMainClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on an action button
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
            return
        }
        // Close modal before navigating
        onClose?.()
        router.push(getEntityUrl(item))
    }

    return (
        <div
            className="relative group w-full"
            onMouseLeave={() => setActionsVisible(false)}
        >
            <div
                onClick={handleMainClick}
                className={clsx(
                    "flex items-center w-full p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                    "bg-[#1a1a1a] border-white/5 hover:border-white/10 hover:bg-neutral-800/50",
                )}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMainClick(e as any)
                }}
            >
                {/* Icon Box */}
                {(() => {
                    // Production: Image or Colored Icon
                    if (item.entity_type === 'performance') {
                        const color = item.metadata?.color || '#c084fc' // purple-400
                        if (item.image_url) {
                            return (
                                <div className="relative w-10 h-10 shrink-0">
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded-md border-2"
                                        style={{ borderColor: color }}
                                    />
                                </div>
                            )
                        }
                        return (
                            <div
                                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center border"
                                style={{
                                    backgroundColor: `${color}1A`, // ~10% opacity
                                    borderColor: `${color}33`, // ~20% opacity
                                    color: color
                                }}
                            >
                                <Layers className="h-5 w-5" />
                            </div>
                        )
                    }

                    // Group: Dynamic Icon + Color
                    if (item.entity_type === 'group') {
                        const color = item.metadata?.performance_color || item.metadata?.color || DEFAULT_GROUP_COLOR // Use performance color or group color or default
                        // @ts-ignore - Dynamic access to icons
                        const GroupIcon = (item.metadata?.icon && LucideIcons[item.metadata.icon])
                            ? LucideIcons[item.metadata.icon as keyof typeof LucideIcons]
                            : Tag

                        return (
                            <div
                                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
                                style={{
                                    backgroundColor: `${color}33`, // ~20% opacity
                                    color: color
                                }}
                            >
                                {/* @ts-ignore */}
                                <GroupIcon className="h-5 w-5" />
                            </div>
                        )
                    }

                    // Note: Colored Note Icon
                    if (item.entity_type === 'note') {
                        const color = item.metadata?.color || '#fbbf24' // amber-400
                        return (
                            <div
                                className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
                                style={{
                                    backgroundColor: `${color}33`, // ~20% opacity
                                    color: color
                                }}
                            >
                                <StickyNote className="h-5 w-5" />
                            </div>
                        )
                    }

                    // Default (Locations, Items, etc.)
                    return (
                        <div className={clsx(
                            "shrink-0 w-10 h-10 rounded-md flex items-center justify-center",
                            "bg-neutral-800 text-neutral-400",
                        )}>
                            <ItemIcon className={clsx("h-5 w-5", itemConfig.colorClass)} />
                        </div>
                    )
                })()}

                {/* Content */}
                <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-neutral-200 truncate leading-none font-sans!">
                            {item.name}
                        </h3>

                        {/* Status Badge */}
                        {item.metadata?.status && (
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                (() => {
                                    if (item.metadata.status === 'active') return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    if (item.metadata.status === 'archived') return "bg-neutral-800 text-neutral-500 border-neutral-700"
                                    return "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                })()
                            )}>
                                {item.metadata.status}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500 truncate h-4">
                        {/* Location or Description */}
                        {(() => {
                            if (item.entity_type === 'group' && item.metadata?.location_name) {
                                return (
                                    <div className="flex items-center gap-1 text-orange-400/80">
                                        <MapPin className="w-3 h-3" />
                                        <span>{item.metadata.location_name}</span>
                                    </div>
                                )
                            }
                            if (description) {
                                return <span className="truncate">{description}</span>
                            }
                            return <span className="opacity-50 italic">No description</span>
                        })()}

                        {/* Performance Next Show */}
                        {item.entity_type === 'performance' && item.metadata?.next_show && (
                            <>
                                <span className="w-0.5 h-0.5 rounded-full bg-neutral-600"></span>
                                <span className="text-green-500/80 font-mono">
                                    Next: {new Date(item.metadata.next_show).toLocaleDateString()}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Quick Actions - Desktop (inline on right) */}
                {actions.length > 0 && (
                    <div className="hidden md:flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {actions.slice(0, 3).map((action) => {
                            const ActionIcon = action.icon
                            return (
                                action.getUrl ? (
                                    <Link
                                        key={action.id}
                                        href={action.getUrl(item)}
                                        className="p-2 rounded-md hover:bg-neutral-700 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onClose?.() // Close modal when navigating
                                        }}
                                        title={action.label}
                                    >
                                        <ActionIcon className="h-4 w-4" />
                                    </Link>
                                ) : (
                                    <button
                                        key={action.id}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            action.handler?.(item)
                                        }}
                                        className="p-2 rounded-md hover:bg-neutral-700 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                                        title={action.label}
                                    >
                                        <ActionIcon className="h-4 w-4" />
                                    </button>
                                )
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Mobile Actions Toggle Button - REMOVED for now as per request to simplify mobile UI */}
            {/* 
            {actions.length > 0 && (
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setActionsVisible(!actionsVisible)
                    }}
                    className={clsx(
                        "absolute top-3 right-3 p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white z-30 md:hidden",
                        actionsVisible && "bg-white text-black border-white"
                    )}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            )} 
            */}

            {/* Mobile Quick Actions Overlay - REMOVED */}
            {/*
            {actions.length > 0 && actionsVisible && (
                <div className="absolute top-14 right-3 flex flex-col gap-1.5 z-20 md:hidden">
                    {actions.slice(0, 3).map((action) => {
                        const ActionIcon = action.icon
                        const commonClasses = "p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-neutral-300 hover:text-white hover:bg-black/80 hover:border-white/30 transition-all shadow-lg active:scale-95"

                        if (action.getUrl) {
                            return (
                                <Link
                                    key={action.id}
                                    href={action.getUrl(item)}
                                    title={action.label}
                                    className={commonClasses}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onClose?.() // Close modal when navigating
                                    }}
                                >
                                    <ActionIcon className="h-4 w-4" />
                                </Link>
                            )
                        }
                        return (
                            <button
                                key={action.id}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    action.handler?.(item)
                                }}
                                title={action.label}
                                className={commonClasses}
                            >
                                <ActionIcon className="h-4 w-4" />
                            </button>
                        )
                    })}
                </div>
            )}
            */}

            {/* Schedule Dialog for Performance */}
            {schedulePerformanceId && (
                <ScheduleShowDialog
                    isOpen={scheduleDialogOpen}
                    onClose={() => {
                        setScheduleDialogOpen(false)
                        setSchedulePerformanceId(null)
                        setSchedulePerformanceColor(null)
                    }}
                    performanceId={schedulePerformanceId}
                    performanceColor={schedulePerformanceColor}
                />
            )}
        </div>
    )
}
