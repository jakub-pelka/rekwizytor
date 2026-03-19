'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function analyzeFloorPlan(locationId: string, imageUrl: string) {
    const supabase = await createClient()

    try {
        // Initialize specific Gemini 3.0 Flash model for mapping
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new Error('GEMINI_API_KEY not set')

        const genAI = new GoogleGenerativeAI(apiKey)
        // User requested specifically "Gemini 3 Flash", which is "gemini-3-flash-preview" in API
        const mappingModel = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        // Prepare prompt for Gemini
        const prompt = `Analyze this floor plan sketch and generate a clean, professional SVG map using Semantic Grouping.
    
    CRITICAL: RETURN ONLY THE RAW SVG CODE. NO MARKDOWN. START WITH <svg...
    
    The SVG must use a semantic structure with grouped elements for easier editing. Follow these rules STRICTLY:

    1. **Canvas**: viewBox="0 0 800 600". NO <rect> background.
    
    2. **GRID SYSTEM (CRITICAL)**:
       - ALL coordinates (x, y, width, height, path points) MUST be multiples of 10.
       - This ensures elements snap perfectly together.
    
    3. **WALLS (ROOM SHAPE - VERY IMPORTANT)**: 
       - CAREFULLY trace the EXACT shape of the room from the sketch.
       - L-shaped rooms, indentations, alcoves, corners, irregular shapes - trace them ALL accurately.
       - Do NOT simplify complex shapes to rectangles.
       - Draw as a SINGLE closed path: <path data-type="wall" d="M x y L x y ... Z" />.
       - Style: fill="none", stroke="#000", stroke-width="5", stroke-linecap="round", stroke-linejoin="round".
    
    4. **SHELVES / FURNITURE (CRITICAL - SEPARATE GROUPS)**:
       - EACH individual shelf MUST be its OWN separate <g data-type="shelf"> element.
       - Do NOT group multiple shelves together.
       - 5 shelves in a row = 5 separate <g data-type="shelf"> elements.
       - Style: fill="#f5f5f5", stroke="#444", stroke-width="2", stroke-dasharray="5,5".
       - Use <rect> inside each group.

    5. **DOORS / ENTRANCES**:
       - Group into <g data-type="door">.
       - Default to opening INWARDS.
    
    6. **X-BOXES (CRITICAL - CLICKABLE)**:
       - Group into <g data-type="xbox">.
       - FIRST child: <rect fill="rgba(200,200,200,0.3)" ... /> (semi-transparent for clicking).
       - THEN add diagonal lines on top.

    7. **CLEANUP**:
       - Snap ALL coordinates to 10px grid.
       - Straighten lines to 90/45 degrees.
    
    Output nothing but the SVG string.`

        // Fetch image data to pass to Gemini
        const imageResp = await fetch(imageUrl)
        if (!imageResp.ok) throw new Error('Failed to fetch image from URL')

        const arrayBuffer = await imageResp.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = imageResp.headers.get('content-type') || 'image/jpeg'

        // Call Gemini (mappingModel is strictly initialized above)
        const result = await mappingModel.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            }
        ])

        const usage = result.response.usageMetadata

        // Log token usage
        if (usage) {
            await supabase.from('ai_usage_logs').insert({
                tokens_input: usage.promptTokenCount,
                tokens_output: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                model_name: 'gemini-3-flash-preview',
                operation_type: 'mapping_ai'
            })
        }

        let svgContent = result.response.text()

        // Clean up response if it contains markdown code blocks despite instructions
        svgContent = svgContent.replaceAll(/```svg/g, '').replaceAll(/```xml/g, '').replaceAll(/```/g, '').trim()

        // Note: map_svg column has been removed from the database
        // SVG content is now managed differently

        return { success: true, svg: svgContent }

    } catch (error) {
        console.error('Error analyzing floor plan:', error)
        return { success: false, error: 'Błąd analizy AI' }
    }
}
