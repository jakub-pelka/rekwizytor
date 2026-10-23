import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cost } from './pricing'

// Limit kosztów AI na teatr (migracja 20261022_ai_budget.sql). Każde wywołanie modelu przechodzi przez
// openAIBudget() przed wywołaniem i recordAIUsage() po nim; robi to generateAI (utils/ai/client.ts)
// i generateEmbedding (utils/embeddings.ts). Nic innego nie powinno wołać dostawcy modelu.

/** Ułamek limitu, od którego Pulpit ostrzega kierownika. */
export const AI_WARN_RATIO = 0.7

export const AI_LIMIT_MESSAGE =
    'Limit podpowiedzi AI w tym teatrze jest wyczerpany. Reszta aplikacji działa jak zwykle. O zwiększenie limitu poproś administratora Rekwizytora.'

export class AIBudgetExceededError extends Error {
    constructor(message: string = AI_LIMIT_MESSAGE) {
        super(message)
        this.name = 'AIBudgetExceededError'
    }
}

/** Tekst dla człowieka: komunikat o limicie, a przy innym błędzie podany tekst zastępczy. */
export function aiErrorMessage(error: unknown, fallback: string): string {
    return error instanceof AIBudgetExceededError ? error.message : fallback
}

export interface AIBudgetStatus {
    budgetUsd: number
    spentUsd: number
    /** Zużycie jako ułamek limitu (1 = cały limit). Przy limicie 0 każde zużycie to przekroczenie. */
    ratio: number
    level: 'ok' | 'warn' | 'exceeded'
}

export function toStatus(budgetUsd: number, spentUsd: number): AIBudgetStatus {
    const ratio = budgetUsd > 0 ? spentUsd / budgetUsd : 1
    const level = ratio >= 1 ? 'exceeded' : ratio >= AI_WARN_RATIO ? 'warn' : 'ok'
    return { budgetUsd, spentUsd, ratio, level }
}

/**
 * Limit i zużycie bieżącego teatru. null, gdy migracji jeszcze nie ma (kod działa wtedy bez limitu).
 * Inny błąd bazy albo brak teatru to wyjątek: lepiej odmówić niż wydawać bez kontroli.
 */
export async function getAIBudgetStatus(supabase: SupabaseClient): Promise<AIBudgetStatus | null> {
    const { data, error } = await supabase.rpc('ai_budget_status')
    if (error) {
        // PGRST202 (PostgREST) i 42883 (Postgres): funkcji nie ma, bo migracja nie była uruchomiona.
        if (error.code === 'PGRST202' || error.code === '42883') return null
        throw new Error(`Nie udało się sprawdzić limitu AI: ${error.message}`)
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new AIBudgetExceededError('Brak teatru, więc AI jest wyłączone. Wybierz teatr albo poproś o dostęp.')
    return toStatus(Number(row.budget_usd), Number(row.spent_usd))
}

export interface AIBudgetContext {
    supabase: SupabaseClient
    /** Baza sprzed migracji limitu: zapis zużycia bez kolumn kosztu. */
    legacy: boolean
}

let warnedScriptMode = false

/**
 * Sprawdza limit teatru bieżącego żądania i zwraca klienta do zapisu zużycia. Przy przekroczeniu rzuca
 * AIBudgetExceededError. Poza aplikacją (skrypty w scripts/ uruchamiane z terminala: brak żądania, brak
 * NEXT_RUNTIME) nie ma teatru ani sesji, więc nic nie liczymy; w serwerze Next ta gałąź nie wystąpi.
 */
export async function openAIBudget(): Promise<AIBudgetContext | null> {
    let supabase: SupabaseClient
    try {
        const { createClient } = await import('@/utils/supabase/server')
        supabase = await createClient()
    } catch (error) {
        if (process.env.NEXT_RUNTIME) throw error
        if (!warnedScriptMode) {
            console.warn('AI poza aplikacją (skrypt): limit teatru i liczenie kosztu pominięte.')
            warnedScriptMode = true
        }
        return null
    }
    const status = await getAIBudgetStatus(supabase)
    if (status?.level === 'exceeded') throw new AIBudgetExceededError()
    return { supabase, legacy: status === null }
}

/** Zapisuje jedno wywołanie z kosztem w ai_usage_logs bieżącego teatru. Błąd zapisu idzie do logu serwera, nie do użytkownika. */
export async function recordAIUsage(
    ctx: AIBudgetContext | null,
    entry: {
        operation: string
        model: string
        tokensInput: number
        tokensOutput: number
        cost: Cost
        details?: Record<string, unknown>
    },
): Promise<void> {
    if (!ctx) return
    try {
        const { error } = await ctx.supabase.from('ai_usage_logs').insert({
            tokens_input: entry.tokensInput,
            tokens_output: entry.tokensOutput,
            total_tokens: entry.tokensInput + entry.tokensOutput,
            model_name: entry.model,
            operation_type: entry.operation,
            ...(!ctx.legacy && { cost_usd: entry.cost.usd, cost_source: entry.cost.source }),
            ...(entry.details && { details: entry.details as never }),
        })
        if (error) console.error('AI: nie zapisano zużycia (koszt nieliczony):', error.message, entry.operation, entry.cost.usd)
    } catch (error) {
        console.error('AI: nie zapisano zużycia (koszt nieliczony):', error)
    }
}
