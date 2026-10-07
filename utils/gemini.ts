import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Gemini is used only for text embeddings (stored vectors are text-embedding-004).
// Text/vision generation goes through utils/ai/client.ts.
const apiKey = process.env.GEMINI_API_KEY

let embeddingModel: GenerativeModel | null = null

if (apiKey) {
    embeddingModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'text-embedding-004' })
} else {
    console.warn('GEMINI_API_KEY not set - embedding search will fall back to full-text search')
}

export { embeddingModel }
