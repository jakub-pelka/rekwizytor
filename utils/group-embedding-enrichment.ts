import { generateAI } from './ai/client'
import { AIBudgetExceededError } from './ai/budget'
import { getPerformanceContextForGroup } from './performance-group-linking'

export interface GroupEnrichmentResult {
    identity: string
    physical: string
    context: string
}

/**
 * Enrich a group name with AI-generated keywords segments for Multi-Vector Search.
 * Model idzie przez wspólny klient (utils/ai/client.ts), więc koszt trafia do limitu teatru.
 * Po wyczerpaniu limitu, albo gdy model zawodzi, zostaje sama nazwa grupy.
 *
 * @param name - The group name
 * @returns Structured enrichment data (identity, physical, context)
 */
export async function enrichGroupNameForEmbedding(name: string): Promise<GroupEnrichmentResult> {
    const fallbackResult: GroupEnrichmentResult = {
        identity: name,
        physical: '',
        context: ''
    }

    const maxRetries = 3

    // Check if group is linked to a performance
    const performanceContext = await getPerformanceContextForGroup(name)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const enriched = parseEnrichmentResponse(
                (await generateAI({ task: 'text', operation: 'group_enrichment', prompt: buildPrompt(name, performanceContext), json: true })).text,
                name
            )

            console.log(`✅ [ENRICH] Success for "${name}"`)
            if (performanceContext) {
                console.log(`✨ Enriched "${name}" with performance context`)
            }
            return enriched

        } catch (e) {
            // Limit wyczerpany: ponowna próba niczego nie zmieni.
            if (e instanceof AIBudgetExceededError) {
                console.warn(`[ENRICH] Limit AI teatru wyczerpany, "${name}" zostaje bez wzbogacenia.`)
                return fallbackResult
            }
            console.error(`❌ [ENRICH] Attempt ${attempt + 1}/${maxRetries} failed:`, e)

            if (attempt < maxRetries - 1) {
                const delay = 1000 * (attempt + 1)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    console.error(`❌ [ENRICH] All attempts failed for "${name}". Using fallback.`)
    return fallbackResult
}

function buildPrompt(name: string, performanceContext: any): string {
    if (performanceContext) {
        return `Jesteś ekspertem od kategoryzacji rekwizytów teatralnych.
                
Grupa: "${name}"
Spektakl: "${performanceContext.title}" (${performanceContext.notes || ''})

ZADANIE: Wygeneruj słowa kluczowe w 3 kategoriach (JSON).

1. IDENTITY (Tożsamość): Co to jest? Synonimy, nazwy.
2. PHYSICAL (Fizyczne): Materiał, cechy (ostre, drewniane), kolor, stan.
3. CONTEXT (Kontekst): Użycie w tym spektaklu, epoka, miejsce, skojarzenia.

Odpowiedz TYLKO JSON:
{
  "identity": "string",
  "physical": "string",
  "context": "string"
}`
    } else {
        return `Jesteś starym rekwizytorem teatralnym. Twoim zadaniem jest opisanie przedmiotu "${name}" dla systemu wyszukiwania.

Rozdziel opis na 3 kategorie:

1. IDENTITY: Co to jest? Synonimy, kategorie, alternatywne nazwy.
   Przykład dla "brzytwa": "brzytwa, golarka, nóż fryzjerski, ostrze do golenia"

2. PHYSICAL: Cechy fizyczne - materiał, kolor, rozmiar, stan.
   Przykład: "metalowa, stalowa, ostra, składana, srebrna"
   WAŻNE: Tylko przymiotniki!

3. CONTEXT: Gdzie/kiedy/przez kogo używane? Skojarzenia, miejsca, zawody, epoki.
   Przykład: "fryzjer, salon, łazienka, golenie, retro, męskie, vintage"
   WAŻNE: Różnorodne słowa kluczowe, BEZ powtórzeń typu "do X" i "używane do X" - wybierz jedną formę!

Wygeneruj JSON dla: "${name}"

{
  "identity": "...",
  "physical": "...",
  "context": "..."
}`
    }
}


function extractJsonFromText(text: string): string {
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
    const codeBlockMatch = codeBlockRegex.exec(text)
    if (codeBlockMatch) {
        console.log(`📝 [ENRICH] Extracted from markdown block`)
        return codeBlockMatch[1].trim()
    }
    return text
}

function trimToJsonBounds(text: string): string {
    const jsonStart = text.search(/[{[]/)
    if (jsonStart === -1) {
        console.error(`❌ [ENRICH] No JSON start ({ or [) found. Response: ${text.substring(0, 100)}`)
        throw new Error('No JSON object found in response')
    }

    let result = jsonStart > 0 ? text.substring(jsonStart) : text

    const jsonEnd = result.lastIndexOf('}')
    const jsonEndArray = result.lastIndexOf(']')
    const actualEnd = Math.max(jsonEnd, jsonEndArray)

    if (actualEnd > -1 && actualEnd < result.length - 1) {
        result = result.substring(0, actualEnd + 1)
    }

    return result
}

function validateEnrichmentStructure(parsed: any, name: string): GroupEnrichmentResult {
    if (!parsed.identity && !parsed.physical && !parsed.context) {
        throw new Error('Missing required fields in response')
    }
    return {
        identity: parsed.identity || name,
        physical: parsed.physical || '',
        context: parsed.context || ''
    }
}

// Helper: Parse and validate enrichment response
function parseEnrichmentResponse(responseText: string, name: string): GroupEnrichmentResult {
    console.log(`🔍 [ENRICH] Raw response length: ${responseText.length}`)

    const extracted = extractJsonFromText(responseText.trim())
    const cleanText = trimToJsonBounds(extracted)

    let parsed
    try {
        parsed = JSON.parse(cleanText)
    } catch (e) {
        console.error(`❌ [ENRICH] JSON Parse Error. Text preview: ${cleanText.substring(0, 100)}...`)
        throw e
    }

    // Handle case when AI returns array instead of object
    if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0]
        console.log(`📦 [ENRICH] Unwrapped array response`)
    }

    return validateEnrichmentStructure(parsed, name)
}
