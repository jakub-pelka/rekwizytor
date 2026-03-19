'use server'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzeGroupImage(imageBase64: string) {
    if (!geminiFlash) {
        return { error: 'AI service unavailable' }
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

        const prompt = `
        Analyze this image and identify ALL distinct categories of items visible.
        For each category, provide a short plural name in Polish and a brief description.
        
        Be specific - if you see multiple types of items (e.g., electronics, tissues, office supplies), 
        create separate groups for each distinct category.
        
        Examples of good category names: "Elektronika", "Kable", "Chusteczki higieniczne", "Artykuły biurowe", "Naczynia", "Broń"
        
        Return ONLY a JSON array:
        [
            { "name": "Nazwa Grupy 1", "description": "Krótki opis kategorii" },
            { "name": "Nazwa Grupy 2", "description": "Krótki opis kategorii" }
        ]
        
        If you only see one type of items, return an array with one element.
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
                operation_type: 'vision_group'
            })
        }

        // Extract JSON array
        const jsonMatch = /\[[\s\S]*\]/.exec(responseText)
        if (!jsonMatch) {
            throw new Error('Invalid AI response format')
        }

        const groups: Array<{ name: string, description: string }> = JSON.parse(jsonMatch[0])

        // Sanitize each group and limit length
        const sanitizedGroups = groups
            .map(group => ({
                name: sanitizeAIOutput(group.name),
                description: sanitizeAIOutput(group.description)
            }))
            .filter(group => group.name.length > 0 && group.name.length <= 100)
            // Remove duplicates (case-insensitive by name)
            .filter((group, index, self) =>
                index === self.findIndex(g => g.name.toLowerCase() === group.name.toLowerCase())
            )

        return {
            groups: sanitizedGroups
        }

    } catch (error) {
        console.error('Vision Analysis Error:', error)
        return { error: 'Failed to analyze image' }
    }
}

