'use server'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzePropsImage(imageBase64: string) {
    if (!geminiFlash) {
        return { error: 'AI service unavailable' }
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

        const prompt = `
        Analyze this image and list ALL visible objects, props, or items.
        Be specific and detailed. Use Polish language.
        Example: instead of "cup" say "Czerwony kubek", instead of "book" say "Stara książka".
        
        Return ONLY a JSON array of item names:
        ["Przedmiot 1", "Przedmiot 2", "Przedmiot 3", ...]
        
        Focus on physical objects that could be props for a theatrical performance.
        `

        const result = await geminiFlash.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            }
        ])

        const responseText = result.response.text()
        const usage = result.response.usageMetadata

        // Log token usage
        if (usage) {
            const { createClient } = await import('@/utils/supabase/server')
            const supabase = await createClient()
            await supabase.from('ai_usage_logs').insert({
                tokens_input: usage.promptTokenCount,
                tokens_output: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                model_name: 'gemini-2.0-flash',
                operation_type: 'vision_props'
            })
        }

        // Extract JSON array
        const jsonMatch = /\[[\s\S]*\]/.exec(responseText)
        if (!jsonMatch) {
            throw new Error('Invalid AI response format')
        }

        const items: string[] = JSON.parse(jsonMatch[0])

        // Sanitize each item and limit length
        const sanitizedItems = items
            .map(item => sanitizeAIOutput(item))
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
        return { error: 'Failed to analyze image' }
    }
}

