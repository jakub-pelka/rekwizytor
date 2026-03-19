'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import { Modal } from '@/components/ui/Modal'

export type SearchContext = 'item' | 'performance' | 'group' | 'location' | 'note' | undefined

interface GlobalSearchDialogProps {
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly initialContext?: SearchContext
}

export function GlobalSearchDialog({ isOpen, onClose, initialContext }: GlobalSearchDialogProps) {
    // Core search state
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [staleResults, setStaleResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false) // Start false, wait for input
    const [searchStrategy, setSearchStrategy] = React.useState<SearchStrategy>('fts')

    // Defer results to prevent blocking renders during typing
    const deferredResults = React.useDeferredValue(results)

    // Enhanced Filter State
    const [entityTypeFilter, setEntityTypeFilter] = React.useState<string[]>([])

    // Consolidate other filters
    const [detailedFilters, setDetailedFilters] = React.useState<import('@/components/search/SearchFilters').FilterState>({
        status: [],
        sortBy: 'relevance'
    })

    // Type dropdown state
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false)
    const typeDropdownRef = React.useRef<HTMLDivElement>(null)

    const t = useTranslations('Navigation')

    const entityTypes = React.useMemo(() => [
        { value: 'all', label: 'All', icon: LayoutGrid },
        { value: 'performance', label: t('productions'), icon: Layers },
        { value: 'group', label: t('groups'), icon: Box },
        { value: 'location', label: t('locations'), icon: MapPin },
        { value: 'note', label: t('notes'), icon: StickyNote },
    ], [t])

    // Load initial context when opened
    React.useEffect(() => {
        if (isOpen && initialContext) {
            setEntityTypeFilter([initialContext])
        } else if (isOpen) {
            setEntityTypeFilter([])
        }
    }, [isOpen, initialContext])

    // Clear state when closed
    React.useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setResults([])
            setStaleResults([])
            setLoading(false)
        }
    }, [isOpen])

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

    // Search logic using unified search
    const search = React.useCallback(async (q: string) => {
        if (!q) {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        setLoading(true)

        // Keep previous results visible (stale-while-revalidate)
        if (results.length > 0) {
            setStaleResults(results)
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
    }, [entityTypeFilter, detailedFilters, results])

    // Debounce search
    React.useEffect(() => {
        if (query.trim() === '') {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        setLoading(true)
        const timer = setTimeout(() => {
            search(query)
        }, 400) // Increased from 150ms to reduce API calls while typing
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])

    // Re-search when filters change (with debounce to avoid double calls)
    React.useEffect(() => {
        if (query.trim()) {
            const timer = setTimeout(() => {
                search(query)
            }, 100)
            return () => clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityTypeFilter, detailedFilters])

    const displayResults = loading && staleResults.length > 0 ? staleResults : deferredResults

    // Group results by entity_type, then by match_type with hierarchical deduplication
    // Priority: FTS > Fuzzy > Vector (if item is in FTS, don't show in Fuzzy or Vector)
    const grouped = React.useMemo(() => {
        const byEntity: Record<string, {
            fts: SearchResult[],
            vector: SearchResult[],
            fuzzy: SearchResult[]
        }> = {}

        // First pass: collect all results by entity type and match type
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

        // Second pass: deduplicate with hierarchy (FTS > Fuzzy > Vector)
        Object.keys(rawGroups).forEach(entityType => {
            const raw = rawGroups[entityType]

            // Collect IDs that are already in higher priority groups
            const ftsIds = new Set(raw.fts.map(r => r.id))
            const fuzzyIds = new Set(raw.fuzzy.map(r => r.id))

            byEntity[entityType] = {
                fts: raw.fts, // FTS always shows (highest priority)
                fuzzy: raw.fuzzy.filter(r => !ftsIds.has(r.id)), // Fuzzy only if not in FTS
                vector: raw.vector.filter(r => !ftsIds.has(r.id) && !fuzzyIds.has(r.id)) // Vector only if not in FTS or Fuzzy
            }
        })

        return byEntity
    }, [displayResults])

    const hasActiveQuery = query.length > 0
    const showStale = loading && staleResults.length > 0

    // Handle switching types
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

    // Handle navigation - close modal on click
    const handleResultClick = () => {
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="4xl"
            className="md:p-0! bg-neutral-900 border-neutral-800"
        >
            <div className="flex flex-col h-[80vh] md:h-[70vh]">
                {/* Header / Search Bar Area */}
                <div className="p-4 border-b border-white/5 sticky top-0 bg-neutral-900 z-20">
                    <MorphingSearchBar
                        mode="input"
                        query={query}
                        onQueryChange={setQuery}
                        loading={loading}
                        autoFocus={true} // Auto focus when modal opens
                        className="shadow-none"
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

                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-3">
                        {/* Entity Type Dropdown */}
                        <div className="relative shrink-0" ref={typeDropdownRef}>
                            <button
                                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-white/5 text-white hover:bg-white/10 border border-white/5"
                                )}
                            >
                                {/* Dynamic Icon based on selection */}
                                {(() => {
                                    const active = entityTypes.find(t => t.value === (currentEntityType || 'all'))
                                    const Icon = active?.icon || Sparkles
                                    return <Icon className="h-3.5 w-3.5" />
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
                                        <div className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden p-1">
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

                        {/* Detailed Filters */}
                        <div className="flex-1 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <SearchFilters
                                entityType={currentEntityType}
                                filters={detailedFilters}
                                onChange={setDetailedFilters}
                            />
                        </div>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {!hasActiveQuery && (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
                            <Sparkles className="h-12 w-12 opacity-20" />
                            <p className="text-sm">Type to start searching...</p>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {hasActiveQuery && !(loading && staleResults.length === 0) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: showStale ? 0.5 : 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full space-y-8 pb-10"
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
                                    const firstItem = matchResults.fts[0] || matchResults.vector[0] || matchResults.fuzzy[0]
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
                                                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-sans!">
                                                    {config.label}
                                                </h2>
                                                <div className="h-px flex-1 bg-neutral-800"></div>
                                            </div>

                                            {/* All Results Combined */}
                                            <div className="flex flex-col gap-2">
                                                {/* FTS Results */}
                                                {matchResults.fts.map((item: SearchResult) => (
                                                    <div
                                                        key={`fts-${item.id}`}
                                                        onClick={handleResultClick}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault()
                                                                handleResultClick()
                                                            }
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <SearchResultCard item={item} />
                                                    </div>
                                                ))}

                                                {/* Fuzzy Results */}
                                                {matchResults.fuzzy.map((item: SearchResult) => (
                                                    <div
                                                        key={`fuzzy-${item.id}`}
                                                        onClick={handleResultClick}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault()
                                                                handleResultClick()
                                                            }
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <SearchResultCard item={item} />
                                                    </div>
                                                ))}

                                                {/* Vector Results */}
                                                {matchResults.vector.map((item: SearchResult) => (
                                                    <div
                                                        key={`vector-${item.id}`}
                                                        onClick={handleResultClick}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault()
                                                                handleResultClick()
                                                            }
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <SearchResultCard item={item} />
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Modal>
    )
}
