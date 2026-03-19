import { z } from 'zod'

/**
 * Strip HTML tags from text - works on server without DOM
 * This is safe because we're removing ALL HTML, not trying to allow some
 */
function stripHtml(text: string): string {
    return text
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style tags and their content
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove all HTML tags
        .replace(/<[^>]*>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Sanitize user input before sending to AI
 * Removes potential injection patterns and limits length
 */
export function sanitizeAIInput(input: string, maxLength: number = 2000): string {
    if (!input) return ''

    // 1. Trim and limit length
    let sanitized = input.trim().slice(0, maxLength)

    // 2. Remove potential injection patterns
    // We use a specific set of patterns that are commonly used for prompt injection
    const injectionPatterns = [
        /ignore\s*(previous|all|earlier)\s*(instructions?|prompts?)/gi,
        /new\s*(task|instruction|prompt|role)/gi,
        /system\s*(override|prompt|instruction)/gi,
        /forget\s*(everything|all|previous)/gi,
        /you\s*are\s*now/gi,
    ]

    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[FILTERED]')
    }

    // 3. Escape multiple newlines (often used to separate prompt sections)
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

    // 4. Remove control characters (except newline and tab)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

    return sanitized
}

/**
 * Validate and parse AI response using Zod schema
 */
export function validateAIResponse<T>(
    response: unknown,
    schema: z.ZodSchema<T>
): T {
    return schema.parse(response)
}

/**
 * Sanitize text returned by AI before displaying in UI
 * Removes HTML and scripts - works on both client and server
 */
export function sanitizeAIOutput(text: string): string {
    if (!text) return ''
    return stripHtml(text)
}

// --- Zod Schemas ---

export const SmartSearchResultSchema = z.object({
    results: z.array(z.object({
        id: z.string().uuid({ message: "Invalid UUID format" }),
        name: z.string().max(200),
        explanation: z.string().max(500),
        matchType: z.enum(['exact', 'close', 'alternative'])
    })).max(10),
    suggestion: z.string().max(500).nullable().optional()
})

export const AIDescriptionSchema = z.object({
    name: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    ai_description: z.string().max(1000).optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    category: z.string().max(100).optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string().max(50)).max(20).optional()
})

export const FastModeSchema = z.object({
    name: z.string().max(200),
    description: z.string().max(2000),
    ai_description: z.string().max(1000),
    tags: z.array(z.string().max(50)).max(20),
    category: z.string().max(100).optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    confidence: z.number().min(0).max(1)
})
