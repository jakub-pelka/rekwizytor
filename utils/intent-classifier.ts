import { ruleBasedClassifier, IntentClassificationResult, IntentWeights } from './intent-classifier-rules'
import { intentLogger } from './intent-pattern-extractor'
import { generateAI, isAIAvailable } from './ai/client'

/**
 * LLM-based Intent Classifier (fallback when rules are uncertain)
 * Uses the fast text model from the AI client for speed and cost efficiency
 */
export class LLMIntentClassifier {
    private readonly CONFIDENCE_THRESHOLD = 0.7

    /**
     * Classify using the fast text model
     */
    async classify(query: string): Promise<IntentClassificationResult | null> {
        if (!isAIAvailable()) {
            console.warn('AI not available for intent classification')
            return null
        }

        const startTime = Date.now()

        try {
            const prompt = `Przeanalizuj zapytanie wyszukiwania i określ wagi (0.0-1.0) dla dwóch kontekstów:

- IDENTITY: kto używa, czyje to, jaka rola/postać, kim się posługuje
- PHYSICAL: jak wygląda, wymiary, kolor, materiał, stan fizyczny

Zapytanie: "${query}"

Zasady:
- Suma identity + physical może być > 1.0 (mogą być oba ważne)
- Jeśli zapytanie dotyczy wyglądu/fizycznych cech → wysokie physical
- Jeśli zapytanie dotyczy posiadacza/roli/kontekstu → wysokie identity

WAŻNE: Odpowiedz TYLKO tym JSON (bez markdown, bez wyjaśnień):
{"identity": 0.X, "physical": 0.X}`

            const result = await generateAI({ task: 'text', operation: 'intent_classification', details: { query }, prompt, json: true, maxTokens: 512 })
            const latencyMs = Date.now() - startTime
            const responseText = result.text

            // Parse JSON response
            const jsonMatch = /\{[^}]+\}/.exec(responseText)
            if (!jsonMatch) {
                console.error('Failed to parse LLM response:', responseText)
                return null
            }

            const weights = JSON.parse(jsonMatch[0]) as IntentWeights

            // Validate
            if (typeof weights.identity !== 'number' || typeof weights.physical !== 'number') {
                console.error('Invalid weights from LLM:', weights)
                return null
            }

            // Normalize if needed (ensure 0-1 range)
            weights.identity = Math.max(0, Math.min(1, weights.identity))
            weights.physical = Math.max(0, Math.min(1, weights.physical))

            return {
                ...weights,
                source: 'llm',
                confidence: 1.0, // LLM is always "confident" in its answer
                latencyMs
            }
        } catch (error) {
            console.error('LLM classification failed:', error)
            return null
        }
    }

    /**
     * Tokenize query (same as rule-based for consistency)
     */
    private tokenize(query: string): string[] {
        return query
            .toLowerCase()
            .replaceAll(/[^\w\sąćęłńóśźż]/gi, ' ')
            .split(/\s+/)
            .filter(token => token.length > 1)
    }
}

/**
 * Hybrid Intent Classifier
 * Tries rules first, falls back to LLM if uncertain
 */
export class IntentClassifier {
    private llmClassifier = new LLMIntentClassifier()
    private readonly CONFIDENCE_THRESHOLD = 0.7

    /**
     * Classify query intent
     * Returns weights for identity and physical contexts
     */
    async classify(query: string): Promise<IntentClassificationResult> {
        // Step 1: Try rule-based first
        const ruleResult = await ruleBasedClassifier.classify(query)

        if (ruleResult && ruleResult.confidence >= this.CONFIDENCE_THRESHOLD) {
            // Rules are confident - use them
            await this.logClassification(query, ruleResult)
            return ruleResult
        }

        // Step 2: Fallback to LLM
        const llmResult = await this.llmClassifier.classify(query)

        if (llmResult) {
            await this.logClassification(query, llmResult)
            return llmResult
        }

        // Step 3: No classification available - return neutral weights
        const fallback: IntentClassificationResult = {
            identity: 0.5,
            physical: 0.5,
            source: ruleResult ? 'rules' : 'hybrid',
            confidence: ruleResult?.confidence || 0
        }

        await this.logClassification(query, fallback)
        return fallback
    }

    /**
     * Log classification for pattern learning
     */
    private async logClassification(query: string, result: IntentClassificationResult): Promise<void> {
        const tokens = query
            .toLowerCase()
            .replaceAll(/[^\w\sąćęłńóśźż]/gi, ' ')
            .split(/\s+/)
            .filter(token => token.length > 1)

        await intentLogger.log({
            query,
            tokens,
            identityScore: result.identity,
            physicalScore: result.physical,
            source: result.source,
            modelName: result.source === 'llm' ? 'llm' : undefined,
            latencyMs: result.latencyMs
        })
    }

    /**
     * Clear rule cache (call after dictionary updates)
     */
    clearCache(): void {
        ruleBasedClassifier.clearCache()
    }
}

/**
 * Singleton instance - use this throughout the app
 */
export const intentClassifier = new IntentClassifier()
