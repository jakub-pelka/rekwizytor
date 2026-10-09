import type { SupabaseClient } from '@supabase/supabase-js'

// Provider-agnostic AI client (OpenAI-compatible chat completions API).
// OPENROUTER_API_KEY set → OpenRouter (with model fallbacks), otherwise OPENAI_API_KEY → OpenAI.
// Models can be overridden per task with AI_MODEL_VISION / AI_MODEL_TEXT.

export type AITask = 'vision' | 'text'

export interface AIImage {
    data: string // base64 without data URL prefix
    mimeType: string
}

export interface AIRequest {
    task: AITask
    prompt: string
    images?: AIImage[]
    json?: boolean
    maxTokens?: number
    /** Lista modeli OpenRouter dla tego wywołania (pierwszy próbowany najpierw); nadpisuje domyślne. */
    models?: string[]
    /**
     * Limit czasu jednej próby. Po jego przekroczeniu próbujemy kolejnego modelu z listy (OpenRouter sam przełącza
     * się tylko przy błędzie, a nie przy zbyt wolnej odpowiedzi). Bez limitu wywołanie czeka bez końca.
     */
    timeoutMs?: number
}

export interface AIResponse {
    text: string
    model: string
    usage: { input: number; output: number; total: number } | null
}

type Provider = 'openrouter' | 'openai'

const PROVIDERS: Record<Provider, { url: string; models: Record<AITask, string[]> }> = {
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        models: {
            vision: ['google/gemini-3.5-flash-lite', 'openai/gpt-6-luna'],
            text: ['google/gemini-3.5-flash-lite', 'openai/gpt-6-luna'],
        },
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        models: {
            vision: ['gpt-5.4-mini'],
            text: ['gpt-5.4-nano'],
        },
    },
}

function getProvider(): { provider: Provider; apiKey: string } | null {
    if (process.env.OPENROUTER_API_KEY) return { provider: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY }
    if (process.env.OPENAI_API_KEY) return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    return null
}

function getModels(provider: Provider, task: AITask): string[] {
    const override = task === 'vision' ? process.env.AI_MODEL_VISION : process.env.AI_MODEL_TEXT
    return override ? override.split(',').map(m => m.trim()) : PROVIDERS[provider].models[task]
}

export function isAIAvailable(): boolean {
    return getProvider() !== null
}

export async function generateAI({ task, prompt, images = [], json = false, maxTokens = 4096, models: modelsOverride, timeoutMs }: AIRequest): Promise<AIResponse> {
    const config = getProvider()
    if (!config) throw new Error('AI not configured - set OPENROUTER_API_KEY or OPENAI_API_KEY')

    const { provider, apiKey } = config
    const models = provider === 'openrouter' && modelsOverride?.length ? modelsOverride : getModels(provider, task)

    const content = images.length
        ? [
            { type: 'text', text: prompt },
            ...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } })),
        ]
        : prompt

    const body: Record<string, unknown> = {
        messages: [{ role: 'user', content }],
        max_completion_tokens: maxTokens,
        ...(json && { response_format: { type: 'json_object' } }),
    }

    if (provider === 'openrouter') {
        body.reasoning = { effort: 'low' }
    } else {
        body.reasoning_effort = 'low'
    }

    const send = async (modelList: string[]) => {
        body.model = modelList[0]
        if (provider === 'openrouter' && modelList.length > 1) body.models = modelList
        else delete body.models
        return fetch(PROVIDERS[provider].url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                ...(provider === 'openrouter' && { 'X-Title': 'Rekwizytor' }),
            },
            body: JSON.stringify(body),
            ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
        })
    }

    // Za wolna odpowiedź pierwszego modelu: próbujemy następnego z listy zamiast czekać dalej.
    let remaining = models
    let response: Response
    for (;;) {
        try {
            response = await send(remaining)
            break
        } catch (error) {
            const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
            if (!timedOut || remaining.length < 2) throw error
            console.warn(`AI: ${remaining[0]} nie odpowiedział w ${timeoutMs} ms, próbuję ${remaining[1]}`)
            remaining = remaining.slice(1)
        }
    }

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API error (${provider} ${response.status}): ${errorText.substring(0, 500)}`)
    }

    const result = await response.json()
    const text: string = result.choices?.[0]?.message?.content?.trim() ?? ''

    return {
        text,
        model: result.model ?? models[0],
        usage: result.usage
            ? { input: result.usage.prompt_tokens, output: result.usage.completion_tokens, total: result.usage.total_tokens }
            : null,
    }
}

// Strips markdown code fences and parses the first JSON object/array in the response.
export function parseAIJson<T = unknown>(text: string): T {
    const cleaned = text.replace(/```(?:json)?\s*|\s*```/g, '').trim()
    try {
        return JSON.parse(cleaned) as T
    } catch {
        const match = /[[{][\s\S]*[\]}]/.exec(cleaned)
        if (!match) throw new Error('No JSON found in AI response')
        return JSON.parse(match[0]) as T
    }
}

export async function logAIUsage(
    supabase: SupabaseClient,
    response: AIResponse,
    operationType: string,
    details?: Record<string, unknown>
): Promise<void> {
    if (!response.usage) return
    try {
        await supabase.from('ai_usage_logs').insert({
            tokens_input: response.usage.input,
            tokens_output: response.usage.output,
            total_tokens: response.usage.total,
            model_name: response.model,
            operation_type: operationType,
            ...(details && { details }),
        })
    } catch (error) {
        console.warn('Failed to log AI usage:', error)
    }
}
