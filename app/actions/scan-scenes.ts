'use server'

import { generateAI, isAIAvailable, logAIUsage, parseAIJson } from '@/utils/ai/client'
import { isAIAllowed } from '@/utils/ai/auth'
import { createClient } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'

export type ScannedScene = {
    _id: string // Temp ID for UI handling (DnD)
    original_number: string | number // What was properly read
    scene_number: number // Proposed system number
    act_number: number | null
    name: string | null
    confidence?: string // 'high', 'low'
    source_index?: number
}

// `error` to klucz tekstu z sekcji SceneImport w messages/pl.json; okno wczytywania pokazuje go po polsku.
export type ScanSceneError = 'errNoFile' | 'errNoAi' | 'errUnauthorized' | 'errBadResponse' | 'errProcessing'

export async function scanSceneImage(formData: FormData): Promise<{ scenes: ScannedScene[], error?: ScanSceneError }> {
    const file = formData.get('file') as File
    const supabase = await createClient()

    if (!file) {
        return { scenes: [], error: 'errNoFile' }
    }

    if (!isAIAvailable()) {
        return { scenes: [], error: 'errNoAi' }
    }
    if (!(await isAIAllowed())) {
        return { scenes: [], error: 'errUnauthorized' }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')

        const prompt = `
        You are a theatrical assistant. Analyze this image of a performance breakdown (scene list).
        Extract ALL scenes from the list in their original order.
        
        For each row, provide:
        - "scene_number" (integer): The number of the scene. Numbering usually restarts at 1 for each new Act.
        - "act_number" (integer): The number of the Act. If not explicitly specified on the page, infer it from headers like "ACT I", "AKT II" or use the last known/inferred Act number.
        - "name" (string): The title, description, or location of the scene.

        Return a JSON object with this exact structure:
        {
            "scenes": [
                { "scene_number": 1, "act_number": 1, "name": "Opening Scene" },
                ...
            ]
        }
        
        IMPORTANT:
        - If the list is long, ensure you extract EVERY single scene. Do not truncate.
        - Use ONLY valid JSON.
        `

        const result = await generateAI({
            task: 'vision',
            prompt,
            images: [{ data: base64Image, mimeType: file.type || 'image/jpeg' }],
            json: true,
            maxTokens: 8192
        })

        await logAIUsage(supabase, result, 'scan_scenes')

        const text = result.text

        try {
            const data = parseAIJson<{ scenes?: { scene_number: number, act_number: number | null, name: string | null }[] }>(text)

            if (!data.scenes || !Array.isArray(data.scenes)) {
                return { scenes: [], error: 'errBadResponse' }
            }

            // Post-process to fit ScannedScene type
            const scenes: ScannedScene[] = data.scenes.map(s => ({
                _id: randomUUID(),
                original_number: s.scene_number,
                scene_number: s.scene_number, // Default to read number, client will re-calc if needed
                act_number: s.act_number,
                name: s.name,
                confidence: 'high' // simplified
            }))

            return { scenes }
        } catch (e) {
            console.error('Failed to parse AI response:', text)
            return { scenes: [], error: 'errBadResponse' }
        }

    } catch (error) {
        console.error('Error scanning scenes:', error)
        return { scenes: [], error: 'errProcessing' }
    }
}
