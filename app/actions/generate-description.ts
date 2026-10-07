'use server'

import { createClient } from '@/utils/supabase/server'
import { generateAI, logAIUsage, parseAIJson, AIImage } from '@/utils/ai/client'
import { Database } from '@/types/supabase'
import { sanitizeAIInput, validateAIResponse, AIDescriptionSchema, sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzeItemWithAI(
    name: string,
    notes?: string | null,
    imageUrl?: string | null,
    groupsList: string = ''
) {
    let prompt = ''
    let images: AIImage[] = []
    let source = 'name' // name, notes, or image

    // 1. SANITIZE INPUTS
    const safeName = sanitizeAIInput(name, 200)
    const safeNotes = notes ? sanitizeAIInput(notes, 2000) : ''
    const safeGroups = sanitizeAIInput(groupsList, 1000)

    // 1. Prioritize User Description (Notes) if available
    if (safeNotes && safeNotes.trim().length > 5) {
        source = 'notes'
        prompt = `
        Przeanalizuj poniższy opis rekwizytu teatralnego (Nazwa: "${safeName}").
        Opis użytkownika: "${safeNotes}"

        Twoim zadaniem jest wygenerowanie metadanych dla inteligentnego wyszukiwania na podstawie tego opisu.
        
        Zwróć obiekt JSON z następującymi polami:
        - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory. (np. "walizka, skóra, brązowy, vintage")
        - attributes: Obiekt JSON z konkretnymi cechami wyciągniętymi z opisu (np. era, materiał, kolor).
        
        Nie generuj pola 'description', ponieważ użyjemy istniejącego opisu użytkownika.

        Output ONLY the JSON object.
        `

        // If image is also present, we can add it for context, but primarily rely on text for specific attributes mentioned by user
        if (imageUrl) {
            const response = await fetch(imageUrl)
            const arrayBuffer = await response.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString('base64')
            const mimeType = response.headers.get('content-type') || 'image/jpeg'

            prompt += "\n(Załączam też zdjęcie pomocniczo, ale priorytet ma opis tekstowy użytkownika)."
            images = [{ data: base64Data, mimeType }]
        }

    }
    // 2. Use Image if no notes
    else if (imageUrl) {
        source = 'image'
        // Fetch image and convert to base64
        const response = await fetch(imageUrl)
        const arrayBuffer = await response.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = response.headers.get('content-type') || 'image/jpeg'

        prompt = `
        Przeanalizuj to zdjęcie rekwizytu teatralnego (Nazwa robocza: "${safeName}").
        
        Dostępne kategorie (grupy): ${safeGroups}

        Zwróć obiekt JSON z następującymi polami:
        - description: Szczegółowy opis po polsku uwzględniający materiał, kolor, styl, epokę, stan i cechy charakterystyczne. Pełne zdania, język naturalny.
        - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory.
        - attributes: Obiekt JSON z konkretnymi cechami.
        - category: Sugerowana nazwa kategorii z listy dostępnych (lub najbardziej pasująca nowa, jeśli żadna nie pasuje).
        
        Output ONLY the JSON object.
        `

        images = [{ data: base64Data, mimeType }]
    }
    // 3. Fallback to Name
    else {
        source = 'name'
        prompt = `
        Jesteś ekspertem od rekwizytów teatralnych.
        Wygeneruj opis dla przedmiotu o nazwie: "${safeName}".
        
        Zwróć obiekt JSON z następującymi polami:
        - description: Szczegółowy, prawdopodobny opis po polsku.
        - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami.
        - attributes: Obiekt JSON z typowymi cechami.

        Output ONLY the JSON object.
        `
    }

    const result = await generateAI({
        task: images.length ? 'vision' : 'text',
        prompt,
        images,
        json: true
    })
    const rawAnalysis = parseAIJson(result.text)

    // 2. VALIDATE OUTPUT
    const validatedAnalysis = validateAIResponse(rawAnalysis, AIDescriptionSchema)

    // 3. SANITIZE OUTPUT TEXT
    const analysis = {
        ...validatedAnalysis,
        description: validatedAnalysis.description ? sanitizeAIOutput(validatedAnalysis.description) : undefined,
        ai_description: validatedAnalysis.ai_description ? sanitizeAIOutput(validatedAnalysis.ai_description) : undefined,
        category: validatedAnalysis.category ? sanitizeAIOutput(validatedAnalysis.category) : undefined,
        // attributes are JSON, so we trust Zod validation structure, but we could sanitize string values inside if needed.
        // For now, we assume attributes structure is safe enough as it's JSON.
    }

    return { analysis, result, source }
}

export async function generateItemDescriptions(itemId: string, currentName: string, currentNotes?: string | null, imageUrl?: string | null) {
    const supabase = await createClient()

    try {
        const { analysis, result, source } = await analyzeItemWithAI(currentName, currentNotes, imageUrl)

        await logAIUsage(supabase, result, 'generate_description', { itemId, itemName: currentName, source })

        // Prepare update object (simplified since performance_props has fewer columns)
        const updateData: any = {
            item_name: analysis.name, // If we want to overwrite name? Or maybe just return it.
        }

        // Update item in database
        const { error } = await supabase
            .from('performance_props')
            .update(updateData)
            .eq('id', itemId)

        if (error) throw error

        return { success: true, data: { ...analysis, source } }

    } catch (error) {
        console.error('Error generating descriptions:', error)
        return { error: 'Failed to generate descriptions' }
    }
}
