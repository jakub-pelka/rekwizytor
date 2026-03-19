'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { correctQueryTypos } from '@/utils/query-correction'
import { classifyQueryIntent, getWeightsForIntent } from '@/utils/search-logic'

// Types for search results
export type SearchResult = {
    entity_type: 'performance' | 'item' | 'group' | 'location' | 'note'
    id: string
    name: string
    description: string | null
    url: string
    image_url: string | null
    metadata: Record<string, any> | null
    score: number
    match_type: 'fts' | 'vector' | 'fuzzy'
}

export type SearchStrategy = 'fts' | 'hybrid' | 'error'

export interface UnifiedSearchOptions {
    matchCount?: number
    entityTypeFilter?: string[]
    statusFilter?: string[]
    sortBy?: 'relevance' | 'date' | 'name'
    filters?: {
        dateFrom?: string
        dateTo?: string
        location?: string
        category?: string
        groupId?: string
    }
}

export interface UnifiedSearchResult {
    results: SearchResult[]
    strategy: SearchStrategy
    totalCount: number
}

/**
 * Execute hybrid search with embeddings and multi-vector logic
 */
async function executeHybridSearch(
    supabase: any,
    query: string,
    matchCount: number
): Promise<SearchResult[]> {
    const correctedQuery = query.length > 3 ? await correctQueryTypos(query) : query
    const queryEmbedding = await generateEmbedding(correctedQuery, TaskType.RETRIEVAL_QUERY)

    const intent = classifyQueryIntent(correctedQuery)
    const weights = getWeightsForIntent(intent)

    console.log(`🔍 Search Intent: [${intent.toUpperCase()}] Weights: ID=${weights.identity}, PHYS=${weights.physical}, CTX=${weights.context}`)

    const { data, error } = await supabase.rpc('search_global_hybrid_mv', {
        query_text: query,
        query_embedding: JSON.stringify(queryEmbedding),
        weight_identity: weights.identity,
        weight_physical: weights.physical,
        weight_context: weights.context,
        match_threshold: 0.4,
        match_count: matchCount,
        fuzzy_threshold: 0.3
    })

    if (error) throw error
    return (data as SearchResult[]) || []
}

/**
 * Execute classic search with FTS and fuzzy matching
 */
async function executeClassicSearch(
    supabase: any,
    query: string,
    matchCount: number
): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_global_direct', {
        query_text: query,
        match_threshold: 0.5,
        match_count: matchCount,
        fuzzy_threshold: 0.3
    })

    if (error) throw error
    return (data as SearchResult[]) || []
}

/**
 * Apply filters to search results
 */
function applyFilters(results: SearchResult[], options?: UnifiedSearchOptions): SearchResult[] {
    let filtered = results

    // Entity type filter
    if (options?.entityTypeFilter?.length) {
        filtered = filtered.filter(r => options.entityTypeFilter!.includes(r.entity_type))
    }

    // Status filter (for performances)
    if (options?.statusFilter?.length) {
        filtered = filtered.filter(r => {
            if (r.entity_type !== 'performance') return true
            const status = r.metadata?.status as string | undefined
            return status && options.statusFilter!.includes(status)
        })
    }

    // Date filters
    const { dateFrom, dateTo } = options?.filters || {}
    if (dateFrom || dateTo) {
        filtered = filtered.filter(r => {
            if (r.entity_type !== 'performance') return true
            const nextShow = r.metadata?.next_show as string | undefined
            if (!nextShow) return false
            if (dateFrom && nextShow < dateFrom) return false
            if (dateTo && nextShow > dateTo) return false
            return true
        })
    }

    // Location filter
    if (options?.filters?.location) {
        const locationQuery = options.filters.location.toLowerCase()
        filtered = filtered.filter(r => {
            const loc = r.metadata?.location_name || r.metadata?.location
            return loc && typeof loc === 'string' && loc.toLowerCase().includes(locationQuery)
        })
    }

    // Category filter
    if (options?.filters?.category) {
        const categoryQuery = options.filters.category.toLowerCase()
        filtered = filtered.filter(r => {
            const cat = r.metadata?.category
            return cat && typeof cat === 'string' && cat.toLowerCase().includes(categoryQuery)
        })
    }

    // Group ID filter
    if (options?.filters?.groupId) {
        filtered = filtered.filter(r => r.metadata?.group_id === options.filters!.groupId)
    }

    return filtered
}

/**
 * Sort search results based on specified criteria
 */
function sortResults(results: SearchResult[], sortBy?: string): SearchResult[] {
    if (sortBy === 'date') {
        return results.sort((a, b) => {
            const dateA = a.metadata?.next_show as string | undefined
            const dateB = b.metadata?.next_show as string | undefined
            if (!dateA) return 1
            if (!dateB) return -1
            return dateA.localeCompare(dateB)
        })
    }

    if (sortBy === 'name') {
        return results.sort((a, b) => a.name.localeCompare(b.name))
    }

    return results // Default: by relevance (already sorted by score)
}

/**
 * Unified search that combines FTS, fuzzy, and vector search
 * Returns all results (FTS + semantic) together
 */
export async function unifiedSearch(
    query: string,
    options?: UnifiedSearchOptions
): Promise<UnifiedSearchResult> {
    try {
        const supabase = await createClient()
        const matchCount = options?.matchCount ?? 30
        const useHybridSearch = process.env.USE_HYBRID_SEARCH === 'true'

        let results: SearchResult[] = []

        // Execute search based on mode
        try {
            if (useHybridSearch) {
                results = await executeHybridSearch(supabase, query, matchCount)
            } else {
                results = await executeClassicSearch(supabase, query, matchCount)
            }
        } catch (searchError) {
            console.error('Search error:', searchError)
            // Fallback to classic search if hybrid fails
            if (useHybridSearch) {
                results = await executeClassicSearch(supabase, query, matchCount)
            }
        }

        // Apply filters and sorting
        results = applyFilters(results, options)
        results = sortResults(results, options?.sortBy)

        return {
            results,
            strategy: useHybridSearch ? 'hybrid' : 'fts',
            totalCount: results.length
        }
    } catch (error) {
        console.error('Unified search error:', error)
        return {
            results: [],
            strategy: 'error',
            totalCount: 0
        }
    }
}

/**
 * Classifies query to determine optimal search strategy
 * - Simple queries (1-2 words, exact names) → FTS only (fast, no AI cost)
 * - Descriptive/semantic queries → Hybrid (FTS + Vector embeddings)
 */


/**
 * Classifies query to determine optimal search strategy
 * (Existing function updated to use intent logic if needed, but we focus on unifiedSearch)
 */
function classifyQueryStrategy(query: string): SearchStrategy {
    // ... existing logic ...
    return 'hybrid' // Default to hybrid for now as we want to test MV
}

// ... inside unifiedSearch function ...

// Execute hybrid search (FTS + Embeddings) with Multi-Vector Logic



/**
 * Refresh the search index manually
 * Useful when pg_cron is not available
 */
export async function refreshSearchIndex(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Note: refresh_search_index function will be added by migration 20251205_enhanced_search.sql
    const { error } = await (supabase.rpc as any)('refresh_search_index')

    if (error) {
        console.error('Failed to refresh search index:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
