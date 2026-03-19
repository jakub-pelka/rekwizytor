import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

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
        if (apiKey && query.length > 3) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

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

                const result = await model.generateContent(prompt)
                const usage = result.response.usageMetadata
                const corrected = result.response.text().trim().replaceAll(/['"]/g, '')

                // Log token usage
                if (usage) {
                    await supabase.from('ai_usage_logs').insert({
                        tokens_input: usage.promptTokenCount,
                        tokens_output: usage.candidatesTokenCount,
                        total_tokens: usage.totalTokenCount,
                        model_name: 'gemini-2.0-flash-exp',
                        operation_type: 'query_correction',
                        details: { originalQuery: query, correctedQuery: corrected }
                    })
                }

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
