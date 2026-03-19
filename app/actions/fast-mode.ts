'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIOutput, validateAIResponse, FastModeSchema } from '@/utils/ai-security'
import { Database } from '@/types/supabase'

const AI_PROMPT = `
Przeanalizuj to zdjęcie rekwizytu teatralnego.
Zidentyfikuj główny obiekt. Zignoruj tło, jeśli to możliwe.

Zwróć obiekt JSON z następującymi polami:
- name: Krótka, opisowa nazwa po polsku (np. "Stara brązowa walizka")
- description: Szczegółowy opis po polsku uwzględniający materiał, kolor, styl, epokę, stan i cechy charakterystyczne. Pełne zdania, język naturalny.
- ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory. Bez zbędnych słów łączących. (np. "walizka, skóra, brązowy, metalowe klamry, vintage, lata 70, zniszczona")
- tags: Tablica stringów po polsku (np. ["walizka", "vintage", "skóra", "lata 70."])
- category: Sugerowana nazwa kategorii.
- attributes: Obiekt JSON z konkretnymi cechami, np. { "era": "lata 70", "material": "skóra", "color": "brązowy", "condition": "dobry" }.
- confidence: Liczba od 0.0 do 1.0 oznaczająca pewność identyfikacji.

Output ONLY the JSON object.
`

async function uploadFileToStorage(supabase: any, file: File, path: string): Promise<boolean> {
    const { error } = await supabase.storage.from('items').upload(path, file)
    if (error) {
        console.error('Upload error:', error)
        return false
    }
    return true
}

function getPublicUrl(supabase: any, filePath: string): string {
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(filePath)
    return publicUrl
}

async function logAIUsage(supabase: any, usage: any, fileName: string): Promise<void> {
    if (!usage) return
    await supabase.from('ai_usage_logs').insert({
        operation_type: 'fast_add',
        tokens_input: usage.promptTokenCount,
        tokens_output: usage.candidatesTokenCount,
        total_tokens: usage.totalTokenCount,
        model_name: 'gemini-2.0-flash',
        details: { fileName }
    })
}

async function analyzeImageWithAI(image: File): Promise<{ name: string } | null> {
    if (!geminiFlash) {
        throw new Error('Gemini AI not available - GEMINI_API_KEY may be missing')
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const result = await geminiFlash.generateContent([
        AI_PROMPT,
        { inlineData: { data: base64Data, mimeType: image.type } }
    ])

    return { _result: result } as any
}

async function createPropInDB(supabase: any, performanceId: string, name: string, imageUrl: string): Promise<any | null> {
    const { data: newProp, error: dbError } = await supabase
        .from('performance_props')
        .insert({
            performance_id: performanceId,
            item_name: name,
            image_url: imageUrl,
            is_checked: false,
        })
        .select()
        .single()

    if (dbError) {
        console.error('Database error:', dbError)
        return null
    }
    return newProp
}

async function processImageWithAI(
    supabase: any,
    image: File,
    publicUrl: string,
    fileName: string,
    performanceId: string
): Promise<any | null> {
    try {
        const arrayBuffer = await image.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString('base64')

        if (!geminiFlash) {
            throw new Error('Gemini AI not available - GEMINI_API_KEY may be missing')
        }

        const result = await geminiFlash.generateContent([
            AI_PROMPT,
            { inlineData: { data: base64Data, mimeType: image.type } }
        ])

        await logAIUsage(supabase, result.response.usageMetadata, fileName)

        const responseText = result.response.text()
        const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
        const rawAnalysis = JSON.parse(jsonString)

        const validatedAnalysis = validateAIResponse(rawAnalysis, FastModeSchema)
        const analysis = {
            ...validatedAnalysis,
            name: sanitizeAIOutput(validatedAnalysis.name),
        }

        return await createPropInDB(supabase, performanceId, analysis.name, publicUrl)
    } catch (error) {
        console.error('AI Processing error:', error)
        // Fallback: Create prop without AI data
        return await createPropInDB(
            supabase,
            performanceId,
            `Nowy rekwizyt (${new Date().toLocaleTimeString()})`,
            publicUrl
        )
    }
}

async function processSingleImage(
    supabase: any,
    image: File,
    thumbnail: File,
    performanceId: string
): Promise<any | null> {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `fast-mode/${fileName}`
    const thumbPath = `fast-mode/thumb_${fileName}`

    const uploaded = await uploadFileToStorage(supabase, image, filePath)
    if (!uploaded) return null

    await uploadFileToStorage(supabase, thumbnail, thumbPath)

    const publicUrl = getPublicUrl(supabase, filePath)

    return processImageWithAI(supabase, image, publicUrl, fileName, performanceId)
}

export async function uploadAndAnalyzeImages(formData: FormData) {
    const supabase = await createClient()
    const images = formData.getAll('images') as File[]
    const thumbnails = formData.getAll('thumbnails') as File[]
    const performanceId = formData.get('performanceId') as string | null

    if (!images.length || !performanceId) {
        throw new Error('Missing required fields: performanceId and images are required now.')
    }

    const results: any[] = []

    for (let i = 0; i < images.length; i++) {
        const newProp = await processSingleImage(supabase, images[i], thumbnails[i], performanceId)
        if (newProp) {
            results.push(newProp)
        }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true, count: results.length }
}
