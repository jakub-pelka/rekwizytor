import { createClient } from '@/utils/supabase/server'
import { generateAI, isAIAvailable } from '@/utils/ai/client'

/**
 * Try to correct typos in search query using fuzzy search + AI
 * This helps embedding search work with misspelled queries
 * 
 * Example: "szkoła roka" → "szkoła rocka"
 * Example: "otrze" → "ostre" 
 */
export async function correctQueryTypos(query: string): Promise<string> {
    try {
        const supabase = await createClient()

        // STEP 1: Try fuzzy search first (fast, uses existing data)
        const { data } = await supabase.rpc('search_global', {
            query_text: query,
            match_threshold: 0.3,
            match_count: 1,
            fuzzy_threshold: 0.2
        })

        if (data && data.length > 0) {
            const bestMatch = data[0]
            console.log(`🔧 Fuzzy corrected "${query}" → "${bestMatch.name}"`)
            return bestMatch.name
        }

        // STEP 2: If no fuzzy match, use AI to normalize the query
        // This handles typos that don't match existing data
        if (isAIAvailable() && query.length > 3) {
            try {
                const prompt = `Popraw błędy ortograficzne w tym zapytaniu wyszukiwania (jeśli są):
"${query}"

Zasady:
- Jeśli nie ma błędów, zwróć DOKŁADNIE ten sam tekst
- Jeśli są błędy, zwróć poprawioną wersję
- Nie dodawaj wyjaśnień, tylko poprawiony tekst
- Zachowaj język (polski/angielski)

Przykłady:
"otrze" → "ostre"
"ostże" → "ostre"
"szkoła roka" → "szkoła rocka"
"brzytwy" → "brzytwy" (bez zmian)

Odpowiedź (tylko poprawiony tekst):`

                const result = await generateAI({ task: 'text', operation: 'query_correction', prompt, maxTokens: 512 })
                const corrected = result.text.replaceAll(/['"]/g, '')

                // Only use AI correction if it's different and reasonable
                if (corrected && corrected !== query && corrected.length < query.length + 5) {
                    console.log(`🤖 AI corrected "${query}" → "${corrected}"`)
                    return corrected
                }
            } catch (aiError) {
                console.error('AI correction failed:', aiError)
            }

        }

        return query
    } catch (error) {
        console.error('Error correcting query typos:', error)
        return query
    }
}
