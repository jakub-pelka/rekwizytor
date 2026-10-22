'use server'

import { generateAI, isAIAvailable, parseAIJson } from '@/utils/ai/client'
import { aiErrorMessage } from '@/utils/ai/budget'
import { isAIAllowed } from '@/utils/ai/auth'
import { sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzeGroupImage(imageBase64: string) {
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
        Analyze this image and identify ALL distinct categories of items visible.
        For each category, provide a short plural name in Polish and a brief description.
        
        Be specific - if you see multiple types of items (e.g., electronics, tissues, office supplies), 
        create separate groups for each distinct category.
        
        Examples of good category names: "Elektronika", "Kable", "Chusteczki higieniczne", "Artykuły biurowe", "Naczynia", "Broń"
        
        Return ONLY a JSON object:
        {
            "groups": [
                { "name": "Nazwa Grupy 1", "description": "Krótki opis kategorii" },
                { "name": "Nazwa Grupy 2", "description": "Krótki opis kategorii" }
            ]
        }
        
        If you only see one type of items, return "groups" with one element.
        `

        const result = await generateAI({
            task: 'vision',
            operation: 'vision_group',
            prompt,
            images: [{ data: base64Data, mimeType }],
            json: true
        })

        type Group = { name: string, description: string }
        const parsed = parseAIJson<{ groups?: Group[] } | Group[]>(result.text)
        const groups = Array.isArray(parsed) ? parsed : parsed.groups
        if (!Array.isArray(groups)) {
            throw new Error('Invalid AI response format')
        }

        // Sanitize each group and limit length
        const sanitizedGroups = groups
            .map(group => ({
                name: sanitizeAIOutput(String(group.name ?? '')),
                description: sanitizeAIOutput(String(group.description ?? ''))
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
        return { error: aiErrorMessage(error, 'Failed to analyze image') }
    }
}

