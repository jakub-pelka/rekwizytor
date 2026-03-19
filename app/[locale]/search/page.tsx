'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Box,
    Layers,
    MapPin,
    StickyNote,
    Sparkles,
    Zap,
    ChevronDown,
    LayoutGrid
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { unifiedSearch, type SearchResult, type SearchStrategy } from '@/app/actions/unified-search'
import { SearchResultCard, getEntityConfig } from '@/components/search/SearchResultCard'
import { SearchFilters } from '@/components/search/SearchFilters'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'

export default function SearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    // Core search state
    const [query, setQuery] = React.useState(initialQuery)
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [staleResults, setStaleResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchStrategy, setSearchStrategy] = React.useState<SearchStrategy>('fts')

    // Defer results to prevent blocking renders during typing
    const deferredResults = React.useDeferredValue(results)

    // Enhanced Filter State
    const initialType = searchParams.get('type')
    const [entityTypeFilter, setEntityTypeFilter] = React.useState<string[]>(
        initialType ? initialType.split(',') : []
    )

    // We consolidate other filters into a single state object for SearchFilters component
    const [detailedFilters, setDetailedFilters] = React.useState<import('@/components/search/SearchFilters').FilterState>({
        status: [],
        sortBy: 'relevance'
    })

    // Type dropdown state for mobile
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false)
    const typeDropdownRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
                setIsTypeDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const t = useTranslations('Navigation')

    const entityTypes = React.useMemo(() => [
        { value: 'all', label: 'All', icon: LayoutGrid }, // Pseudo-type for "All"
        { value: 'performance', label: t('productions'), icon: Layers },
        { value: 'group', label: t('groups'), icon: Box },
        { value: 'location', label: t('locations'), icon: MapPin },
        { value: 'note', label: t('notes'), icon: StickyNote },
    ], [t])

    // Search logic using unified search
    const search = React.useCallback(async (q: string, currentResults?: SearchResult[]) => {
        if (!q) {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        setLoading(true)

        // Keep previous results visible (stale-while-revalidate)
        if (currentResults && currentResults.length > 0) {
            setStaleResults(currentResults)
        }

        try {
            const response = await unifiedSearch(q, {
                matchCount: 20,
                entityTypeFilter: entityTypeFilter.length > 0 ? entityTypeFilter : undefined,
                statusFilter: detailedFilters.status.length > 0 ? detailedFilters.status : undefined,
                sortBy: detailedFilters.sortBy,
                filters: {
                    dateFrom: detailedFilters.dateFrom,
                    dateTo: detailedFilters.dateTo,
                    location: detailedFilters.location,
                    category: detailedFilters.category,
                    groupId: detailedFilters.groupId
                }
            })

            setResults(response.results)
            setSearchStrategy(response.strategy)
            setStaleResults([])
        } catch (err) {
            console.error('Search exception:', err)
        } finally {
            setLoading(false)
        }
    }, [entityTypeFilter, detailedFilters])


    // Debounce search (Standard Mode ONLY)
    React.useEffect(() => {
        if (query.trim() === '') {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        // Determine which search to run
        setLoading(true)
        const timer = setTimeout(() => {
            search(query, results)
        }, 400) // Increased from 150ms to reduce API calls while typing
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])

    // Re-search when filters change
    React.useEffect(() => {
        if (query.trim()) {
            search(query, results)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityTypeFilter, detailedFilters])

    // Update URL logic to rely on `type` param mapping
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (query) params.set('q', query)
            else params.delete('q')

            // Sync type param
            if (entityTypeFilter.length > 0) params.set('type', entityTypeFilter.join(','))
            else params.delete('type')

            const newSearch = params.toString()
            const currentSearch = searchParams.toString()

            if (newSearch !== currentSearch) {
                const newUrl = newSearch ? `?${newSearch}` : window.location.pathname
                window.history.replaceState(null, '', newUrl)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query, entityTypeFilter, searchParams])

    const displayResults = loading && staleResults.length > 0 ? staleResults : deferredResults

    // Group results by entity_type with hierarchical deduplication
    // Priority: FTS > Fuzzy > Vector
    const grouped = React.useMemo(() => {
        const byEntity: Record<string, {
            fts: SearchResult[],
            vector: SearchResult[],
            fuzzy: SearchResult[]
        }> = {}

        // First pass: collect all results
        const rawGroups: Record<string, {
            fts: SearchResult[],
            vector: SearchResult[],
            fuzzy: SearchResult[]
        }> = {}

        displayResults.forEach(item => {
            if (!rawGroups[item.entity_type]) {
                rawGroups[item.entity_type] = { fts: [], vector: [], fuzzy: [] }
            }

            const matchType = item.match_type || 'fts'
            if (matchType === 'fts') {
                rawGroups[item.entity_type].fts.push(item)
            } else if (matchType === 'vector') {
                rawGroups[item.entity_type].vector.push(item)
            } else if (matchType === 'fuzzy') {
                rawGroups[item.entity_type].fuzzy.push(item)
            }
        })

        // Second pass: deduplicate (FTS > Fuzzy > Vector)
        Object.keys(rawGroups).forEach(entityType => {
            const raw = rawGroups[entityType]
            const ftsIds = new Set(raw.fts.map(r => r.id))
            const fuzzyIds = new Set(raw.fuzzy.map(r => r.id))

            byEntity[entityType] = {
                fts: raw.fts,
                fuzzy: raw.fuzzy.filter(r => !ftsIds.has(r.id)),
                vector: raw.vector.filter(r => !ftsIds.has(r.id) && !fuzzyIds.has(r.id))
            }
        })

        return byEntity
    }, [displayResults])

    const hasActiveQuery = query.length > 0
    const showStale = loading && staleResults.length > 0

    // Handle Tab Selection
    const handleTypeSelect = (type: string) => {
        if (type === 'all') {
            setEntityTypeFilter([])
        } else {
            setEntityTypeFilter([type])
        }
        // Reset specific filters when switching types
        setDetailedFilters(prev => ({
            ...prev,
            status: [],
            dateFrom: undefined,
            dateTo: undefined,
            location: undefined,
            category: undefined,
            groupId: undefined
        }))
    }

    const currentEntityType = entityTypeFilter.length === 1 ? entityTypeFilter[0] : null

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
            {/* Centered Content Container */}
            <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 md:px-8 relative z-10">

                {/* Search Bar Container - Animates from Center to Top using transform for GPU acceleration */}
                <motion.div
                    initial={false}
                    animate={{
                        y: hasActiveQuery ? 0 : 'calc(35vh - 2rem)',
                        paddingTop: '2rem',
                        paddingBottom: hasActiveQuery ? '2rem' : '0'
                    }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                    style={{ willChange: 'transform' }}
                    className="w-full flex flex-col items-center z-50"
                >
                    <div className="w-full max-w-3xl relative space-y-3">
                        {/* Main Search Input */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeInOut", type: "tween" }}
                            className="max-w-4xl mx-auto space-y-4"
                        >
                            {/* Search Input */}
                            <MorphingSearchBar
                                mode="input"
                                query={query}
                                onQueryChange={setQuery}
                                loading={loading}
                                autoFocus={true}
                                rightContent={
                                    hasActiveQuery && !loading && (
                                        <div className={clsx(
                                            "hidden sm:flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded",
                                            searchStrategy === 'hybrid'
                                                ? "bg-purple-500/20 text-purple-300"
                                                : "bg-neutral-700/50 text-neutral-400"
                                        )}>
                                            {searchStrategy === 'hybrid' ? <Zap className="h-2.5 w-2.5" /> : 'FTS'}
                                        </div>
                                    )
                                }
                            />

                            {/* Secondary Row: Entity Dropdown & Filters */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full relative z-40">

                                {/* Entity Type Dropdown */}
                                <div className="relative shrink-0" ref={typeDropdownRef}>
                                    <button
                                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg bg-white text-black hover:bg-neutral-200"
                                        )}
                                    >
                                        {/* Dynamic Icon based on selection */}
                                        {(() => {
                                            const active = entityTypes.find(t => t.value === (currentEntityType || 'all'))
                                            const Icon = active?.icon || Sparkles
                                            return <Icon className="h-4 w-4" />
                                        })()}

                                        <span>
                                            {entityTypes.find(t => t.value === (currentEntityType || 'all'))?.label}
                                        </span>
                                        <ChevronDown className={clsx(
                                            "h-3 w-3 ml-1 opacity-50 transition-transform duration-200",
                                            isTypeDropdownOpen ? "rotate-180" : ""
                                        )} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {isTypeDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.1 }}
                                                className="absolute top-full left-0 pt-2 w-48 z-50 origin-top-left"
                                            >
                                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden p-1">
                                                    {entityTypes.map(({ value, label, icon: Icon }) => (
                                                        <button
                                                            key={value}
                                                            onClick={() => {
                                                                handleTypeSelect(value)
                                                                setIsTypeDropdownOpen(false)
                                                            }}
                                                            className={clsx(
                                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                                                (currentEntityType || 'all') === value
                                                                    ? "bg-white/10 text-white font-medium"
                                                                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                                            )}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Dynamic Filters Area */}
                                <div className="flex-1 w-full md:w-auto">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentEntityType || 'all'}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center flex-wrap gap-2"
                                        >
                                            <SearchFilters
                                                entityType={currentEntityType}
                                                filters={detailedFilters}
                                                onChange={setDetailedFilters}
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                </motion.div>

                {/* Results Container */}
                <AnimatePresence mode="wait">
                    {hasActiveQuery && !(loading && staleResults.length === 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: showStale ? 0.5 : 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full pb-20 space-y-8"
                        >
                            {/* No Results State */}
                            {displayResults.length === 0 && !loading && (
                                <div className="text-center py-20">
                                    <p className="text-xl font-bold text-neutral-600">
                                        No results found for "{query}"
                                    </p>
                                </div>
                            )}

                            {/* Results Grid - Grouped by Entity Type, then by Match Type */}
                            {Object.entries(grouped).map(([entityType, matchResults]) => {
                                // Check if there are any results for this entity type
                                const hasFts = matchResults.fts.length > 0
                                const hasVector = matchResults.vector.length > 0
                                const hasFuzzy = matchResults.fuzzy.length > 0

                                if (!hasFts && !hasVector && !hasFuzzy) return null

                                // Use the first available item to determine config
                                const firstItem = matchResults.fts[0] || matchResults.fuzzy[0] || matchResults.vector[0]
                                const config = getEntityConfig(firstItem)
                                const Icon = config.icon

                                return (
                                    <motion.div
                                        key={entityType}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        {/* Entity Type Header */}
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md bg-white/5 ${config.colorClass}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
                                                {config.label}
                                            </h2>
                                            <div className="h-px flex-1 bg-neutral-800"></div>
                                        </div>

                                        {/* All Results Combined */}
                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                                            {/* FTS Results */}
                                            {matchResults.fts.map((item: SearchResult, index: number) => (
                                                <SearchResultCard
                                                    key={`fts-${item.id}-${index}`}
                                                    item={item}
                                                />
                                            ))}

                                            {/* Fuzzy Results */}
                                            {matchResults.fuzzy.map((item: SearchResult, index: number) => (
                                                <SearchResultCard
                                                    key={`fuzzy-${item.id}-${index}`}
                                                    item={item}
                                                />
                                            ))}

                                            {/* Vector Results */}
                                            {matchResults.vector.map((item: SearchResult, index: number) => (
                                                <SearchResultCard
                                                    key={`vector-${item.id}-${index}`}
                                                    item={item}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    )
}
