import { createClient } from '@/utils/supabase/server'

/**
 * Intent Classification Result
 */
export interface IntentWeights {
    identity: number  // 0.0 - 1.0
    physical: number  // 0.0 - 1.0
}

export interface IntentClassificationResult extends IntentWeights {
    source: 'rules' | 'llm' | 'hybrid'
    confidence: number  // 0.0 - 1.0, how confident we are
    latencyMs?: number
}

/**
 * Rule-Based Intent Classifier
 * Fast keyword matching against database dictionary
 */
export class RuleBasedClassifier {
    private keywords: Map<string, { identity: number; physical: number }> = new Map()
    private lastCacheUpdate: number = 0
    private readonly CACHE_TTL = 60000 // 1 minute

    /**
     * Load keywords from database (with caching)
     */
    private async loadKeywords(): Promise<void> {
        const now = Date.now()

        // Use cached keywords if fresh
        if (this.keywords.size > 0 && now - this.lastCacheUpdate < this.CACHE_TTL) {
            return
        }

        try {
            const supabase = await createClient()
            const { data, error } = await supabase
                .from('intent_keywords')
                .select('keyword, identity_weight, physical_weight')

            if (error) {
                console.error('Error loading keywords:', error)
                return
            }

            this.keywords.clear()
            data?.forEach(row => {
                this.keywords.set(row.keyword, {
                    identity: row.identity_weight,
                    physical: row.physical_weight
                })
            })

            this.lastCacheUpdate = now
            console.log(`📚 Loaded ${this.keywords.size} intent keywords`)
        } catch (error) {
            console.error('Failed to load intent keywords:', error)
        }
    }

    /**
     * Tokenize query into lowercase words
     */
    private tokenize(query: string): string[] {
        return query
            .toLowerCase()
            .replaceAll(/[^\w\sąćęłńóśźż]/gi, ' ') // Remove punctuation, keep Polish chars
            .split(/\s+/)
            .filter(token => token.length > 1) // Ignore single chars
    }

    /**
     * Classify query using keyword matching
     */
    async classify(query: string): Promise<IntentClassificationResult | null> {
        await this.loadKeywords()

        if (this.keywords.size === 0) {
            return null // No keywords loaded, can't classify
        }

        const tokens = this.tokenize(query)
        if (tokens.length === 0) {
            return null
        }

        let identitySum = 0
        let physicalSum = 0
        let matchCount = 0

        for (const token of tokens) {
            const weights = this.keywords.get(token)
            if (weights) {
                identitySum += weights.identity
                physicalSum += weights.physical
                matchCount++
            }
        }

        // Need at least one match to classify
        if (matchCount === 0) {
            return null
        }

        // Calculate average weights
        const identity = identitySum / tokens.length
        const physical = physicalSum / tokens.length

        // Confidence = percentage of tokens that matched
        const confidence = matchCount / tokens.length

        return {
            identity,
            physical,
            source: 'rules',
            confidence
        }
    }

    /**
     * Clear keyword cache (useful after dictionary updates)
     */
    clearCache(): void {
        this.keywords.clear()
        this.lastCacheUpdate = 0
    }
}

/**
 * Singleton instance
 */
export const ruleBasedClassifier = new RuleBasedClassifier()
