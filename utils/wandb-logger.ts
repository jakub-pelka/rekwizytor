/**
 * Weights & Biases Logger for Embedding Tests
 * 
 * Simplified logging for Next.js server actions
 * Full W&B integration requires Python client or CLI
 */

interface WandBConfig {
    embedding_model: string
    enrichment_model: string
    tester_model: string
    target_query_count: number
    difficulty_mode: string
    mvs_weight_identity: number
    mvs_weight_physical: number
    mvs_weight_context: number
    use_dynamic_weights: boolean
}

interface WandBMetrics {
    accuracy_at_1: number
    accuracy_at_5: number
    accuracy_at_10: number
    mean_reciprocal_rank: number
    average_rank: number
    total_queries: number
    successful_queries: number
    total_search_tokens: number
    total_tester_tokens: number
}

// Global state for current run
let currentRunId: string | null = null
let currentRunConfig: WandBConfig | null = null

/**
 * Initialize W&B run
 * Logs config to console - actual W&B integration pending
 */
export async function initWandBRun(
    runId: string,
    config: WandBConfig
): Promise<any> {
    if (!process.env.WANDB_API_KEY) {
        console.log('⏭️  [W&B] API key not set, skipping')
        return null
    }

    try {
        currentRunId = runId
        currentRunConfig = config

        const runName = `${config.embedding_model}_${config.enrichment_model}`

        console.log(`✅ [W&B] Run initialized: ${runName}`)
        console.log(`📊 [W&B] Config:`, {
            embedding: config.embedding_model,
            enrichment: config.enrichment_model,
            tester: config.tester_model,
            queries: config.target_query_count
        })

        return { id: runId, name: runName, config }
    } catch (error) {
        console.error('❌ [W&B] Init failed:', error)
        return null
    }
}

/**
 * Log metrics during test
 */
export async function logWandBMetrics(
    step: number,
    metrics: Partial<WandBMetrics>
) {
    if (!currentRunId) return

    try {
        console.log(`📊 [W&B] Step ${step}:`, {
            'acc_at_1': ((metrics.accuracy_at_1 || 0) * 100).toFixed(1) + '%',
            'acc_at_5': ((metrics.accuracy_at_5 || 0) * 100).toFixed(1) + '%',
            mrr: metrics.mean_reciprocal_rank?.toFixed(3),
            queries: `${metrics.successful_queries}/${metrics.total_queries}`
        })
    } catch (error) {
        console.error('❌ [W&B] Log failed:', error)
    }
}

/**
 * Log final summary
 */
export async function logWandBSummary(metrics: WandBMetrics) {
    if (!currentRunId) return

    try {
        // Calculate cost
        const searchCostPer1M = 0.02
        const testerCostPer1M = 0.15

        const totalCost =
            (metrics.total_search_tokens / 1_000_000) * searchCostPer1M +
            (metrics.total_tester_tokens / 1_000_000) * testerCostPer1M

        const summary = {
            accuracy_at_1: (metrics.accuracy_at_1 * 100).toFixed(1) + '%',
            accuracy_at_5: (metrics.accuracy_at_5 * 100).toFixed(1) + '%',
            accuracy_at_10: (metrics.accuracy_at_10 * 100).toFixed(1) + '%',
            mrr: metrics.mean_reciprocal_rank.toFixed(3),
            avg_rank: metrics.average_rank.toFixed(2),
            success_rate: ((metrics.successful_queries / metrics.total_queries) * 100).toFixed(1) + '%',
            total_tokens: (metrics.total_search_tokens + metrics.total_tester_tokens).toLocaleString(),
            cost: '$' + totalCost.toFixed(4)
        }

        console.log('📊 [W&B] Final Summary:', summary)

        // Export to JSON for manual upload
        const exportData = {
            run_id: currentRunId,
            config: currentRunConfig,
            metrics: {
                accuracy_at_1: metrics.accuracy_at_1,
                accuracy_at_5: metrics.accuracy_at_5,
                accuracy_at_10: metrics.accuracy_at_10,
                mean_reciprocal_rank: metrics.mean_reciprocal_rank,
                average_rank: metrics.average_rank,
                success_rate: metrics.successful_queries / metrics.total_queries,
                total_tokens: metrics.total_search_tokens + metrics.total_tester_tokens,
                cost_usd: totalCost
            },
            timestamp: new Date().toISOString()
        }

        console.log('💾 [W&B] Export data:', JSON.stringify(exportData, null, 2))

    } catch (error) {
        console.error('❌ [W&B] Summary failed:', error)
    }
}

/**
 * Finish run
 */
export async function finishWandBRun() {
    if (!currentRunId) return

    try {
        console.log(`✅ [W&B] Run finished: ${currentRunId}`)
        currentRunId = null
        currentRunConfig = null
    } catch (error) {
        console.error('❌ [W&B] Finish failed:', error)
    }
}
