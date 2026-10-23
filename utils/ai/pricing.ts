// Koszt wywołania modelu w dolarach. To jedyne miejsce, które go liczy (patrz utils/ai/client.ts, utils/embeddings.ts).
// 1. OpenRouter podaje koszt w odpowiedzi (usage.cost, prosimy o to przez usage.include), bierzemy go bez zmian.
// 2. Gdy dostawca nie podał kosztu (OpenAI wprost, embeddingi), liczymy z tokenów i cennika niżej.
//    Cennik jest celowo zawyżony, więc limit raczej zadziała za wcześnie niż za późno. Do potwierdzenia z cennikami dostawców.

export type CostSource = 'provider' | 'estimate'
export interface Cost { usd: number; source: CostSource }

/** Dolary za milion tokenów: wejście i wyjście. Pasuje najdłuższy prefiks nazwy modelu. */
const PRICES: Record<string, { input: number; output: number }> = {
    'google/gemini-3.5-flash-lite': { input: 0.3, output: 1.2 },
    'openai/gpt-6-luna': { input: 1.0, output: 4.0 },
    'gpt-5.4-mini': { input: 0.8, output: 3.2 },
    'gpt-5.4-nano': { input: 0.2, output: 1.0 },
    'text-embedding-004': { input: 0.15, output: 0 },
    'text-embedding-3-small': { input: 0.05, output: 0 },
    'text-embedding-3-large': { input: 0.2, output: 0 },
    'voyage': { input: 0.2, output: 0 },
    'mistral-embed': { input: 0.15, output: 0 },
}

/** Nieznany model: cena wysoka, żeby brak wpisu w cenniku nie ukrywał kosztu. */
const UNKNOWN_MODEL_PRICE = { input: 3.0, output: 12.0 }

function priceFor(model: string): { input: number; output: number } {
    const key = Object.keys(PRICES)
        .filter(k => model.startsWith(k))
        .sort((a, b) => b.length - a.length)[0]
    return key ? PRICES[key] : UNKNOWN_MODEL_PRICE
}

/** Liczba tokenów wejścia i wyjścia → koszt. Wynik zaokrąglony do 6 miejsc (kolumna cost_usd). */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
    const p = priceFor(model)
    return round6((inputTokens * p.input + outputTokens * p.output) / 1_000_000)
}

/** Koszt z odpowiedzi czatu: usage.cost od dostawcy, a gdy go nie ma, z tokenów. */
export function costFromUsage(
    model: string,
    usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | undefined | null,
): Cost {
    if (typeof usage?.cost === 'number' && Number.isFinite(usage.cost) && usage.cost >= 0) {
        return { usd: round6(usage.cost), source: 'provider' }
    }
    return { usd: estimateCostUsd(model, usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0), source: 'estimate' }
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6
