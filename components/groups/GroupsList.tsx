'use client'

import { Database } from '@/types/supabase'
import { DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'
import { GroupCard } from './GroupCard'
import { GroupListItem } from './GroupListItem'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, MapPin, Warehouse, Briefcase, Home, Package } from 'lucide-react'
import { FilterBar } from '@/components/ui/FilterBar'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'
import { Button } from '@/components/ui/Button'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { GroupDetailsDialog } from './GroupDetailsDialog'
import { EditGroupDialog } from './EditGroupDialog'
import { LocationJumpBar } from './LocationJumpBar'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon' | 'color' | 'created_at' | 'location_id' | 'description' | 'performance_id'> & {
        locations: { name: string } | null
        performances: { title: string; color?: string | null } | null
    }

interface GroupsListProps {
    groups: Group[]
    currentParentId: string | null
}

export function GroupsList({ groups, currentParentId }: GroupsListProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('highlight')
    const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({})
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
    const [selectedGroupDetails, setSelectedGroupDetails] = useState<Group | null>(null)
    const [editingGroup, setEditingGroup] = useState<Group | null>(null)
    const [activeLocation, setActiveLocation] = useState<string | undefined>(undefined)

    const router = useRouter()
    const supabase = createClient()
    const viewGroupId = searchParams.get('viewGroup')
    const editGroupId = searchParams.get('editGroup')

    useEffect(() => {
        if (viewGroupId) {
            const group = groups.find(g => g.id === viewGroupId)
            if (group) setSelectedGroupDetails(group)
        }
    }, [viewGroupId, groups])

    // Listen for updates from GroupKanbanManager
    useEffect(() => {
        const pageLoadTime = Date.now()

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const lastUpdate = sessionStorage.getItem('groups_updated')
                if (lastUpdate && Number.parseInt(lastUpdate) > pageLoadTime) {
                    console.log('Groups updated signal detected, refreshing...')
                    sessionStorage.removeItem('groups_updated')
                    router.refresh()
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Also check immediately in case we navigated back
        const lastUpdate = sessionStorage.getItem('groups_updated')
        if (lastUpdate && Number.parseInt(lastUpdate) > pageLoadTime - 5000) {
            sessionStorage.removeItem('groups_updated')
            router.refresh()
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [router])

    useEffect(() => {
        if (editGroupId) {
            const group = groups.find(g => g.id === editGroupId)
            if (group) setEditingGroup(group)
        }
    }, [editGroupId, groups])

    const handleEdit = (group: Group) => {
        setSelectedGroupDetails(null)
        setEditingGroup(group)
    }

    const handleDelete = async (group: Group) => {
        if (!confirm(`Czy na pewno usunąć grupę "${group.name}"?`)) return

        try {
            const { error } = await supabase.from('groups').delete().eq('id', group.id)
            if (error) throw error

            notify.success('Grupa usunięta')
            setSelectedGroupDetails(null)
            router.refresh()
        } catch (error) {
            console.error('Delete error:', error)
            notify.error('Nie udało się usunąć grupy')
        }
    }

    useEffect(() => {
        const savedViewMode = localStorage.getItem('groups_view_mode') as 'list' | 'grid'
        if (savedViewMode) {
            setViewMode(savedViewMode)
        }
    }, [])

    const handleViewModeChange = (mode: 'list' | 'grid') => {
        setViewMode(mode)
        localStorage.setItem('groups_view_mode', mode)
    }

    const getLocationIcon = (name: string) => {
        const n = name.toLowerCase()
        if (n.includes('magazyn')) return <Warehouse className="w-4 h-4" />
        if (n.includes('biuro')) return <Briefcase className="w-4 h-4" />
        if (n.includes('dom')) return <Home className="w-4 h-4" />
        if (n.includes('pudło') || n.includes('karton')) return <Package className="w-4 h-4" />
        return <MapPin className="w-4 h-4" />
    }

    // Filter groups to show only children of current parent
    // Per user feedback, subgroups are not used. Showing all groups or flat structure.
    const currentLevelGroups = groups

    // Memoize groupedByLocation to prevent recalculation
    const groupedByLocation = useMemo(() => {
        return currentLevelGroups.reduce((acc, group) => {
            const locationName = group.locations?.name || 'Unassigned'
            if (!acc[locationName]) {
                acc[locationName] = []
            }
            acc[locationName].push(group)
            return acc
        }, {} as Record<string, Group[]>)
    }, [currentLevelGroups])

    // Initialize expanded state for all locations on mount
    useEffect(() => {
        const initialExpanded: Record<string, boolean> = {}
        Object.keys(groupedByLocation).forEach(loc => {
            initialExpanded[loc] = true
        })
        setExpandedLocations(initialExpanded)
    }, [groupedByLocation])

    // Handle highlight logic
    useEffect(() => {
        if (highlightId && groups.length > 0) {
            const targetGroup = groups.find(g => g.id === highlightId)
            if (targetGroup) {
                // 1. Expand location
                const locationName = targetGroup.locations?.name || 'Unassigned'
                setExpandedLocations(prev => ({ ...prev, [locationName]: true }))

                // 2. Scroll to element after a brief delay
                setTimeout(() => {
                    const element = document.getElementById(`group-${highlightId}`)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        element.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-black')
                        setTimeout(() => {
                            element.classList.remove('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-black')
                        }, 2000)
                    }
                }, 100)
            }
        }
    }, [highlightId, groups])

    // Handle jumpToLocation param
    const jumpToLocation = searchParams.get('jumpToLocation')
    useEffect(() => {
        if (jumpToLocation) {
            // Small delay to ensure rendering
            setTimeout(() => {
                handleJumpToLocation(jumpToLocation)
            }, 500)
        }
    }, [jumpToLocation])

    // Clear activeLocation on manual scroll
    useEffect(() => {
        let isScrollingTimeout: NodeJS.Timeout

        const handleScroll = () => {
            // Only clear if it was set (to avoid unnecessary re-renders)
            if (activeLocation) {
                // We clear it immediately on interaction
                setActiveLocation(undefined)
            }
        }

        globalThis.addEventListener('wheel', handleScroll)
        globalThis.addEventListener('touchmove', handleScroll)

        return () => {
            globalThis.removeEventListener('wheel', handleScroll)
            globalThis.removeEventListener('touchmove', handleScroll)
        }
    }, [activeLocation])

    if (currentLevelGroups.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500">Brak grup w tej kategorii.</p>
            </div>
        )
    }

    const toggleLocation = (location: string) => {
        setExpandedLocations(prev => ({ ...prev, [location]: !prev[location] }))
    }

    const sortedLocations = Object.keys(groupedByLocation).sort((a, b) => {
        if (a === 'Unassigned') return 1
        if (b === 'Unassigned') return -1
        return a.localeCompare(b)
    })

    const locationItems = sortedLocations.map(loc => ({
        name: loc,
        count: groupedByLocation[loc].length
    }))

    const handleJumpToLocation = (locationName: string) => {
        setActiveLocation(locationName)
        const element = document.getElementById(`location-${locationName.replaceAll(/\s+/g, '-')}`)
        if (element) {
            // Use block: 'start' and inline: 'nearest' for better positioning
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <>
            <div className="space-y-4">
                {/* Static Filter Bar */}
                <div className="mb-2">
                    <FilterBar>
                        <div className="flex-1 w-full xl:w-auto min-w-[300px]">
                            <MorphingSearchBar mode="trigger" context="group" className="w-full" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <ViewToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
                        </div>
                    </FilterBar>
                </div>

                {/* Sticky Location Jump Bar */}
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md -mx-4 px-4 py-3 md:-mx-10 md:px-10 border-b border-neutral-800 mb-6 transition-all duration-200">
                    <LocationJumpBar
                        locations={locationItems}
                        activeLocation={activeLocation}
                        onLocationClick={handleJumpToLocation}
                    />
                </div>

                {sortedLocations.map(location => (
                    <div
                        key={location}
                        id={`location-${location.replace(/\s+/g, '-')}`}
                        className="space-y-4 scroll-mt-36"
                    >
                        <button
                            onClick={() => toggleLocation(location)}
                            className="sticky top-[64px] z-20 flex items-center gap-2 text-sm font-semibold text-neutral-500 uppercase tracking-wider hover:text-white transition-all w-full text-left group bg-background/95 backdrop-blur-md py-3 px-2 -mx-2 rounded-lg border-b border-white/5 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.05)]"
                        >
                            {expandedLocations[location] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <div className="flex items-center gap-2 text-neutral-400 group-hover:text-neutral-300">
                                {location !== 'Unassigned' && getLocationIcon(location)}
                                <span className="text-neutral-300 group-hover:text-white transition-colors">{location}</span>
                            </div>
                            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full group-hover:bg-neutral-700 group-hover:text-white transition-colors">
                                {groupedByLocation[location].length}
                            </span>
                        </button>

                        {expandedLocations[location] && (
                            viewMode === 'list' ? (
                                <div className="flex flex-col bg-neutral-900/20 rounded-xl overflow-hidden border border-neutral-800 ml-2 mt-4">
                                    {groupedByLocation[location].map(group => {
                                        // With no subgroups, count is 0
                                        const childrenCount = 0
                                        // Effective color prioritization
                                        const effectiveColor = group.performances?.color || group.color || DEFAULT_GROUP_COLOR
                                        const groupWithColor = { ...group, color: effectiveColor }

                                        return (
                                            <div key={group.id} id={`group-${group.id}`}>
                                                <GroupListItem
                                                    group={groupWithColor}
                                                    subgroupCount={childrenCount}
                                                    onClick={() => setSelectedGroupDetails(group)}
                                                    onEdit={() => handleEdit(group)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-2 border-l border-neutral-800 ml-2 mt-4">
                                    {groupedByLocation[location].map(group => {
                                        // With no subgroups, count is 0
                                        const childrenCount = 0
                                        // Effective color prioritization
                                        const effectiveColor = group.performances?.color || group.color || DEFAULT_GROUP_COLOR
                                        const groupWithColor = { ...group, color: effectiveColor }

                                        return (
                                            <div key={group.id} id={`group-${group.id}`} className="transition-all duration-300">
                                                <GroupCard
                                                    group={groupWithColor}
                                                    subgroupCount={childrenCount}
                                                    onClick={() => setSelectedGroupDetails(group)}
                                                    onEdit={() => handleEdit(group)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        )}
                    </div>
                ))}
            </div>

            <GroupDetailsDialog
                group={selectedGroupDetails}
                open={!!selectedGroupDetails}
                onOpenChange={(open) => !open && setSelectedGroupDetails(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EditGroupDialog
                group={editingGroup}
                isOpen={!!editingGroup}
                onClose={() => setEditingGroup(null)}
            />
        </>
    )
}
