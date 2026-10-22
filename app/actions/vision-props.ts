'use server'

import { generateAI, isAIAvailable, parseAIJson } from '@/utils/ai/client'
import { aiErrorMessage } from '@/utils/ai/budget'
import { isAIAllowed } from '@/utils/ai/auth'
import { sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzePropsImage(imageBase64: string) {
    if (!isAIAvailable()) {
        return { error: 'AI service unavailable' }
    }
    if (!(await isAIAllowed())) {
        return { error: 'Unauthorized' }
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
        const mimeType = /^data:(image\/\w+);base64,/.exec(imageBase64)?.[1] ?? 'image/jpeg'

        const prompt = `
        Analyze this image and list ALL visible objects, props, or items.
        Be specific and detailed. Use Polish language.
        Example: instead of "cup" say "Czerwony kubek", instead of "book" say "Stara książka".
        
        Return ONLY a JSON object:
        { "items": ["Przedmiot 1", "Przedmiot 2", "Przedmiot 3", ...] }
        
        Focus on physical objects that could be props for a theatrical performance.
        `

        const result = await generateAI({
            task: 'vision',
            operation: 'vision_props',
            prompt,
            images: [{ data: base64Data, mimeType }],
            json: true
        })

        const parsed = parseAIJson<{ items?: string[] } | string[]>(result.text)
        const items = Array.isArray(parsed) ? parsed : parsed.items
        if (!Array.isArray(items)) {
            throw new Error('Invalid AI response format')
        }

        // Sanitize each item and limit length
        const sanitizedItems = items
            .map(item => sanitizeAIOutput(String(item)))
            .filter(item => item.length > 0 && item.length <= 100)
            // Remove duplicates (case-insensitive)
            .filter((item, index, self) =>
                index === self.findIndex(t => t.toLowerCase() === item.toLowerCase())
            )

        return {
            items: sanitizedItems
        }

    } catch (error) {
        console.error('Vision Analysis Error:', error)
        return { error: aiErrorMessage(error, 'Failed to analyze image') }
    }
}

