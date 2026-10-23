import { embeddingModel } from './gemini'
import { TaskType } from '@google/generative-ai'
import { openAIBudget, recordAIUsage } from './ai/budget'
import { estimateCostUsd } from './ai/pricing'

// In-memory cache for query embeddings
const queryEmbeddingCache = new Map<string, number[]>()
const MAX_CACHE_SIZE = 100

type EmbeddingProvider = 'google' | 'openai' | 'voyage' | 'mistral'

interface ModelConfig {
    provider: EmbeddingProvider
    model: string
}

const MODEL_MAPPING: Record<string, ModelConfig> = {
    'gemini-text-embedding-004': { provider: 'google', model: 'text-embedding-004' },
    'text-embedding-004': { provider: 'google', model: 'text-embedding-004' },
    // Google v2? Not standard, but user asked. Sticking to 004 as standard.
    'text-embedding-3-small': { provider: 'openai', model: 'text-embedding-3-small' },
    'text-embedding-3-large': { provider: 'openai', model: 'text-embedding-3-large' },
    'voyage-3': { provider: 'voyage', model: 'voyage-3' },
    'voyage-3-lite': { provider: 'voyage', model: 'voyage-3-lite' },
    'voyage-3.5': { provider: 'voyage', model: 'voyage-3.5' },
    'voyage-3.5-lite': { provider: 'voyage', model: 'voyage-3.5-lite' },
    'mistral-embed': { provider: 'mistral', model: 'mistral-embed' },
}

export async function generateEmbedding(
    text: string,
    taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
    modelName: string = 'text-embedding-004'
): Promise<number[]> {
    const config = MODEL_MAPPING[modelName] || MODEL_MAPPING['gemini-text-embedding-004']

    // Cache key includes model name to prevent collisions between different dimension embeddings
    const cacheKey = taskType === TaskType.RETRIEVAL_QUERY ? `${modelName}:${text.toLowerCase().trim()}` : null

    // Validate input - reject empty strings
    if (!text || text.trim().length === 0) {
        throw new Error('Cannot generate embedding for empty string')
    }

    // Limit kosztów teatru: przed pamięcią podręczną (jest wspólna dla teatrów, więc teatr po limicie nie dostaje cudzego trafienia)
    // i przed wywołaniem dostawcy. Poza try, żeby komunikat o limicie nie zginął w „Failed to generate”.
    const budget = await openAIBudget()

    if (cacheKey && queryEmbeddingCache.has(cacheKey)) {
        return queryEmbeddingCache.get(cacheKey)!
    }

    let embedding: number[]

    try {
        switch (config.provider) {
            case 'openai':
                embedding = await generateOpenAIEmbedding(text, config.model)
                break
            case 'voyage':
                embedding = await generateVoyageEmbedding(text, config.model, taskType)
                break
            case 'mistral':
                embedding = await generateMistralEmbedding(text, config.model)
                break
            case 'google':
            default:
                embedding = await generateGeminiEmbedding(text, taskType, config.model)
                break
        }

        if (cacheKey) {
            if (queryEmbeddingCache.size >= MAX_CACHE_SIZE) {
                const firstKey = queryEmbeddingCache.keys().next().value
                if (firstKey) queryEmbeddingCache.delete(firstKey)
            }
            queryEmbeddingCache.set(cacheKey, embedding)
        }

        // Dostawcy embeddingów nie zwracają zużytych tokenów, więc liczymy z długości tekstu (ok. 4 znaki na token).
        const estimatedTokens = Math.ceil(text.length / 4)
        await recordAIUsage(budget, {
            operation: taskType === TaskType.RETRIEVAL_QUERY ? 'smart_search' : 'embedding_indexing',
            model: modelName,
            tokensInput: estimatedTokens,
            tokensOutput: 0,
            cost: { usd: estimateCostUsd(config.model, estimatedTokens, 0), source: 'estimate' },
            details: { taskType, textLength: text.length },
        })

        return embedding
    } catch (error) {
        console.error(`Error generating embedding with ${modelName}:`, error)
        throw new Error(`Failed to generate embedding with ${modelName}`)
    }
}

async function generateGeminiEmbedding(text: string, taskType: TaskType, model: string): Promise<number[]> {
    if (!embeddingModel) throw new Error('Gemini embedding model not available')
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType
    })
    return result.embedding.values
}

async function generateOpenAIEmbedding(text: string, model: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    const body: any = { input: text, model }

    // Optional: add dimensions for v3 models if we ever need to fetch smaller vectors
    // if (model.includes('text-embedding-3')) {
    //     body.dimensions = 768; 
    // }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    return result.data[0].embedding
}

async function generateVoyageEmbedding(text: string, model: string, taskType: TaskType): Promise<number[]> {
    const apiKey = process.env.VOYAGE_API_KEY
    if (!apiKey) throw new Error('VOYAGE_API_KEY not set')

    const inputType = taskType === TaskType.RETRIEVAL_QUERY ? 'query' : 'document'

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ input: text, model, input_type: inputType })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Voyage AI API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    return result.data[0].embedding
}

async function generateMistralEmbedding(text: string, model: string): Promise<number[]> {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set')

    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ input: [text], model })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Mistral API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    return result.data[0].embedding
}

export function clearEmbeddingCache() {
    queryEmbeddingCache.clear()
}
