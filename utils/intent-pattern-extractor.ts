import { createClient } from '@/utils/supabase/server'

/**
 * Intent Classification Logging Service
 * Logs all classification decisions for pattern extraction
 */
export class IntentLogger {
    /**
     * Log a classification decision
     */
    async log(params: {
        query: string
        tokens: string[]
        identityScore: number
        physicalScore: number
        source: 'rules' | 'llm' | 'hybrid'
        modelName?: string
        latencyMs?: number
    }): Promise<void> {
        // Skip logging during development/testing to save Supabase limits
        const isProduction = process.env.NODE_ENV === 'production' && process.env.ENABLE_INTENT_LOGGING === 'true'

        if (!isProduction) {
            console.log('🔕 [INTENT] Skipping Supabase logging (dev/test mode)')
            return
        }

        // Note: intent_classification_logs table has been removed from the database
        // This logging functionality is disabled until the table is recreated
        console.log('🔕 [INTENT] Logging disabled - table not available')
        
        /* try {
            const supabase = await createClient()

            await supabase.from('intent_classification_logs').insert({
                query: params.query,
                tokens: params.tokens,
                identity_score: params.identityScore,
                physical_score: params.physicalScore,
                source: params.source,
                model_name: params.modelName,
                latency_ms: params.latencyMs
            })
        } catch (error) {
            console.error('Failed to log intent classification:', error)
            // Don't throw - logging failures shouldn't break classification
        } */
    }

    /**
     * Get classification stats for the last N days
     */
    async getStats(days: number = 7): Promise<any[]> {
        try {
            const supabase = await createClient()

            const { data, error } = await supabase.rpc('get_intent_classification_stats', {
                days
            })

            if (error) {
                console.error('Error fetching intent stats:', error)
                return []
            }

            return data || []
        } catch (error) {
            console.error('Failed to fetch intent stats:', error)
            return []
        }
    }
}

/**
 * Pattern Extractor Service
 * Analyzes logs to find keywords that should be added to dictionary
 */
export class PatternExtractor {
    /**
     * Extract patterns from recent logs
     * Returns keywords that appear frequently with consistent scores
     */
    async extractPatterns(params: {
        minOccurrences?: number
        minConfidenceScore?: number
        daysBack?: number
    } = {}): Promise<Array<{
        keyword: string
        avgIdentity: number
        avgPhysical: number
        occurrences: number
    }>> {
        // Note: intent_classification_logs table has been removed from the database
        // This functionality is disabled until the table is recreated
        console.log('🔕 [INTENT] Pattern extraction disabled - table not available')
        return []
        
        /* const {
            minOccurrences = 5,
            minConfidenceScore = 0.6,
            daysBack = 30
        } = params

        try {
            const supabase = await createClient()

            // Get all LLM-sourced logs from the last N days
            const { data: logs, error } = await supabase
                .from('intent_classification_logs')
                .select('tokens, identity_score, physical_score')
                .eq('source', 'llm')
                .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

            if (error || !logs) {
                console.error('Error fetching logs:', error)
                return []
            }

            // Aggregate scores by keyword
            const wordScores = new Map<string, {
                identityScores: number[]
                physicalScores: number[]
            }>()

            for (const log of logs) {
                for (const token of log.tokens) {
                    if (!wordScores.has(token)) {
                        wordScores.set(token, {
                            identityScores: [],
                            physicalScores: []
                        })
                    }
                    wordScores.get(token)!.identityScores.push(log.identity_score)
                    wordScores.get(token)!.physicalScores.push(log.physical_score)
                }
            }

            // Filter and format results
            const patterns: Array<{
                keyword: string
                avgIdentity: number
                avgPhysical: number
                occurrences: number
            }> = []

            for (const [keyword, scores] of wordScores.entries()) {
                const occurrences = scores.identityScores.length

                if (occurrences < minOccurrences) {
                    continue
                }

                const avgIdentity = scores.identityScores.reduce((a, b) => a + b, 0) / occurrences
                const avgPhysical = scores.physicalScores.reduce((a, b) => a + b, 0) / occurrences

                // Only include if one dimension is strongly preferred
                if (Math.max(avgIdentity, avgPhysical) >= minConfidenceScore) {
                    patterns.push({
                        keyword,
                        avgIdentity,
                        avgPhysical,
                        occurrences
                    })
                }
            }

            // Sort by occurrences (most common first)
            patterns.sort((a, b) => b.occurrences - a.occurrences)

            return patterns
        } catch (error) {
            console.error('Failed to extract patterns:', error)
            return []
        } */
    }

    /**
     * Add extracted patterns to the keywords dictionary
     */
    async updateDictionary(patterns: Array<{
        keyword: string
        avgIdentity: number
        avgPhysical: number
        occurrences: number
    }>): Promise<{ added: number; skipped: number }> {
        try {
            const supabase = await createClient()

            let added = 0
            let skipped = 0

            for (const pattern of patterns) {
                const { error } = await supabase
                    .from('intent_keywords')
                    .insert({
                        keyword: pattern.keyword,
                        identity_weight: pattern.avgIdentity,
                        physical_weight: pattern.avgPhysical,
                        source: 'auto-learned',
                        confidence: pattern.occurrences
                    })

                if (!error) {
                    added++
                    console.log(`✅ Added keyword: "${pattern.keyword}" (${pattern.occurrences} occurrences)`)
                } else {
                    skipped++
                    // Likely duplicate - that's fine
                }
            }

            return { added, skipped }
        } catch (error) {
            console.error('Failed to update dictionary:', error)
            return { added: 0, skipped: patterns.length }
        }
    }
}

/**
 * Singleton instances
 */
export const intentLogger = new IntentLogger()
export const patternExtractor = new PatternExtractor()
