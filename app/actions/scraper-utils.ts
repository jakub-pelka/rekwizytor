
const PL_MONTHS: { [key: string]: string } = {
    'stycznia': '01', 'styczeń': '01',
    'lutego': '02', 'luty': '02',
    'marca': '03', 'marzec': '03',
    'kwietnia': '04', 'kwiecień': '04',
    'maja': '05', 'maj': '05',
    'czerwca': '06', 'czerwiec': '06',
    'lipca': '07', 'lipiec': '07',
    'sierpnia': '08', 'sierpień': '08',
    'września': '09', 'wrzesień': '09',
    'października': '10', 'październik': '10',
    'listopada': '11', 'listopad': '11',
    'grudnia': '12', 'grudzień': '12'
}

function parsePolishDate(text: string): Date | null {
    const textLower = text.toLowerCase()
    const monthNames = Object.keys(PL_MONTHS).join('|')
    const plDateRegex = new RegExp(`(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})`)

    const plMatch = plDateRegex.exec(textLower)
    if (plMatch) {
        const day = plMatch[1].padStart(2, '0')
        const month = PL_MONTHS[plMatch[2]]
        const year = plMatch[3]
        return new Date(`${year}-${month}-${day}`)
    }

    const numericMatch = /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/.exec(text)
    if (numericMatch) {
        const day = numericMatch[1].padStart(2, '0')
        const month = numericMatch[2].padStart(2, '0')
        const year = numericMatch[3]
        return new Date(`${year}-${month}-${day}`)
    }

    return null
}

export function cleanHtmlContent(html: string): string {
    return html.replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "")
        .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "")
        .replaceAll(/<[^>]+>/g, " ")
        .replaceAll(/\s+/g, " ")
}

// --- Title Helpers ---

function getOgTitle(html: string): string | null {
    const match = /<meta\s+property=["']og:title["']\s+content=["'](.*?)["']\s*\/?>/i.exec(html)
    return match && match[1] ? match[1].trim() : null
}

function getH1Title(html: string): string | null {
    const match = /<h1[^>]*>(.*?)<\/h1>/i.exec(html)
    return match && match[1] ? match[1].replaceAll(/<[^>]+>/g, '').trim() : null
}

function getTitleTag(html: string): string | null {
    const match = /<title>(.*?)<\/title>/i.exec(html)
    return match && match[1] ? match[1].trim() : null
}

export function extractTitle(html: string, cleanHtml: string): string {
    let title = getOgTitle(html) || ''
    if (title) {
        title = title.split(' - ')[0].split(' | ')[0].trim()
    }

    if (!title) title = getH1Title(html) || ''
    if (!title) {
        const t = getTitleTag(html) || ''
        title = t.split('-')[0].split('|')[0].trim()
    }

    return title
}

// --- Date Helpers ---

export function extractPremiereDate(cleanHtml: string): string {
    let premiereDate: string = new Date().toISOString()
    const premiereRegex = /(?:premiera|prapremiera)\s*[:=-]?\s*(\d{1,2}(?:\s*i\s*\d{1,2})?[^\d]{0,10}?(?:\d{4}|[a-zęóąśłżźćń]+)\s*(?:\d{4})?)/i
    let premiereMatch = premiereRegex.exec(cleanHtml)

    if (premiereMatch) {
        const dateStr = premiereMatch[1]
        const pDate = parsePolishDate(dateStr)
        if (pDate) {
            premiereDate = pDate.toISOString()
        } else {
            const doubleDateMatch = /(\d{1,2})\s+i\s+\d{1,2}\s+([a-zęóąśłżźćń]+)\s+(\d{4})/i.exec(dateStr)
            if (doubleDateMatch) {
                const day = doubleDateMatch[1]
                const monthName = doubleDateMatch[2]
                const year = doubleDateMatch[3]
                const constructedString = `${day} ${monthName} ${year}`
                const pDate2 = parsePolishDate(constructedString)
                if (pDate2) premiereDate = pDate2.toISOString()
            }
        }
    }
    return premiereDate
}

export function extractShowDates(html: string): string[] {
    const dates: string[] = []
    const termIndex = html.indexOf('Najbliższe terminy')

    if (termIndex !== -1) {
        const textAfterTerms = html.slice(termIndex, termIndex + 10000)
        // Match date DD.MM.YYYY followed optionally by time HH:MM (with optional "godz." prefix)
        const dateRegex = /\b(\d{1,2})[.-/](\d{1,2})[.-/](\d{4})(?:\s+(?:godz\.?|o godz\.?)?\s*(\d{1,2})[:.](\d{2}))?/gi

        let match
        const uniqueDates = new Set<string>()

        while ((match = dateRegex.exec(textAfterTerms)) !== null) {
            const day = match[1].padStart(2, '0')
            const month = match[2].padStart(2, '0')
            const year = match[3]

            let hour = '19'
            let minute = '00'

            // If time matched (groups 4 and 5)
            if (match[4] && match[5]) {
                hour = match[4].padStart(2, '0')
                minute = match[5].padStart(2, '0')
            }

            const dateStr = `${year}-${month}-${day}T${hour}:${minute}:00`
            uniqueDates.add(dateStr)
        }

        dates.push(...Array.from(uniqueDates))
    }
    return dates
}

// --- Description Helpers ---

function getOgDescription(html: string): string | null {
    const match = /<meta\s+property=["']og:description["']\s+content=["'](.*?)["']\s*\/?>/i.exec(html)
    return match && match[1] ? match[1].trim() : null
}

function getMetaDescription(html: string): string | null {
    const match = /<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i.exec(html)
    return match && match[1] ? match[1].trim() : null
}

function findTextContentDescription(html: string): string | null {
    // Look for the specific content section used by this CMS
    const sectionMatch = /<section[^>]*class=["'][^"']*text-content[^"']*["'][^>]*>([\s\S]*?)<\/section>/i.exec(html)
    if (!sectionMatch) return null

    const content = sectionMatch[1]

    // Extract text from divs and paragraphs within this section
    // We look for tags that likely contain text blocks
    const matches: string[] = []
    const regex = /<(?:div|p)[^>]*>(.*?)<\/(?:div|p)>/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
        matches.push(match[0])
    }
    if (matches.length === 0) return null

    let bestDescription = ''

    for (const tag of matches) {
        const cleanText = tag.replaceAll(/<[^>]+>/g, '').trim()
        // Filter out short lines, headers pretending to be divs, or metadata
        if (cleanText.length > 50 &&
            !cleanText.toUpperCase().includes('NA AFISZU') &&
            !cleanText.toUpperCase().includes('BILETY') &&
            !cleanText.startsWith('oraz:') && // Explicitly exclude cast list start
            !cleanText.includes('zespół wokalny w składzie')) {

            // If we already have a good chunk, append this one if it looks like a continuation
            if (bestDescription) {
                bestDescription += ' ' + cleanText
            } else {
                bestDescription = cleanText
            }

            // If we have enough text (e.g. > 500 chars), stop to avoid grabbing too much footer info
            if (bestDescription.length > 800) break
        }
    }

    return bestDescription || null
}

function findBodyDescription(html: string): string | null {
    // Fallback: look for any paragraph in the whole body
    const pMatches: string[] = []
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi
    let pMatch: RegExpExecArray | null
    while ((pMatch = pRegex.exec(html)) !== null) {
        pMatches.push(pMatch[0])
    }
    if (pMatches.length === 0) return null

    for (const p of pMatches) {
        const cleanP = p.replaceAll(/<[^>]+>/g, '').trim()
        if (cleanP.length > 50 &&
            !cleanP.toUpperCase().includes('NA AFISZU') &&
            !cleanP.toUpperCase().includes('BILETY') &&
            !cleanP.startsWith('oraz:') &&
            !cleanP.includes('zespół wokalny w składzie')) {
            return cleanP
        }
    }
    return null
}

function cleanDescriptionText(desc: string): string {
    let d = desc
        .replaceAll(/&nbsp;/g, ' ')
        .replaceAll(/&amp;/g, '&')
        .replaceAll(/&quot;/g, '"')
        .replaceAll(/&#39;/g, "'")
        .trim()

    const cleanupRegex = /^(?:.*?)(?:w wieku|od lat|dla widzów powyżej|dla widzów od|lat)\s*\d+(?:\s*lat|\+)?(?:[.]|[\s]*musical w \d+ aktach[.]?)?\s*/i
    const match = cleanupRegex.exec(d)
    if (match && match[0].length < 250) {
        d = d.replace(cleanupRegex, '')
    }

    // Remove "Nominacja..." lines if they are at the start
    d = d.replaceAll(/^(?:Nominacja|Nagroda|Trzecie miejsce)[^.]+\.\s*/gi, '')

    const sentenceMatches: string[] = []
    const sentenceRegex = /[^.!?]+[.!?]+/g
    let sentenceMatch: RegExpExecArray | null
    while ((sentenceMatch = sentenceRegex.exec(d)) !== null) {
        sentenceMatches.push(sentenceMatch[0])
    }
    if (sentenceMatches.length > 0) {
        // Return up to 5 sentences to get a fuller description if utilizing the section scraper
        const limit = d.length > 500 ? 5 : 3
        return sentenceMatches.slice(0, limit).join(' ').trim()
    } else if (d.length > 300) {
        return d.slice(0, 300) + '...'
    }
    return d
}

export function extractDescription(html: string): string {
    let description = getOgDescription(html)
        || getMetaDescription(html)
        || ''

    // Prefer text content extraction if specific structure exists, or if meta desc is weak
    if (!description || description.length < 20 || description.toUpperCase().includes('KONTAKT')) {
        const textContentDesc = findTextContentDescription(html)
        if (textContentDesc) {
            description = textContentDesc
        } else {
            const bodyDesc = findBodyDescription(html)
            if (bodyDesc) description = bodyDesc
        }
    }

    return cleanDescriptionText(description)
}

// --- Image Helpers ---

function getOgImage(html: string): string | null {
    const match = /<meta\s+property=["']og:image["']\s+content=["'](.*?)["']\s*\/?>/i.exec(html)
    return match && match[1] ? match[1].trim() : null
}

function getJsonLdImage(html: string): string | null {
    const match = /<script\s+type=["']application\/ld\+json["']>(.*?)<\/script>/i.exec(html)
    if (match && match[1]) {
        try {
            const json = JSON.parse(match[1])
            if (json.image) {
                return Array.isArray(json.image) ? json.image[0] : json.image
            }
        } catch (error) {
            console.error('Failed to parse JSON-LD for image extraction:', error)
        }
    }
    return null
}

function isValidImageSrc(src: string): boolean {
    const s = src.toLowerCase()
    const isSpecial = s.includes('logo') || s.includes('icon')
    const isPixel = s.endsWith('.svg') || s.includes('pixel') || s.includes('blank')
    return !isSpecial && !isPixel
}

function getBodyImages(html: string): string[] {
    const imgMatches: string[] = []
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let imgMatch: RegExpExecArray | null
    while ((imgMatch = imgRegex.exec(html)) !== null) {
        imgMatches.push(imgMatch[0])
    }
    if (imgMatches.length === 0) return []

    const candidates: string[] = []
    let count = 0

    for (const tag of imgMatches) {
        if (count >= 3) break
        const srcMatch = /src=["']([^"']+)["']/i.exec(tag)
        const src = srcMatch ? srcMatch[1] : ''

        if (src && isValidImageSrc(src)) {
            candidates.push(src)
            count++
        }
    }
    return candidates
}

function resolveUrl(candidate: string, baseUrl: string): string | null {
    if (candidate.startsWith('/')) {
        try {
            const urlObj = new URL(baseUrl)
            return `${urlObj.origin}${candidate}`
        } catch (error) {
            console.error('Failed to parse base URL:', baseUrl, error)
            return null
        }
    }

    if (candidate.startsWith('http')) return candidate
    return null
}

async function validateAndFetchImage(candidate: string, baseUrl: string): Promise<string | null> {
    const fullUrl = resolveUrl(candidate, baseUrl)
    if (!fullUrl) return null

    try {
        console.log(`[Scraper] Trying candidate: ${fullUrl.substring(0, 50)}...`)
        const imageResponse = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': baseUrl,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        })

        if (imageResponse.ok) {
            const rawContentType = imageResponse.headers.get('content-type')
            const contentType = rawContentType ? rawContentType.split(';')[0].trim() : 'image/jpeg'

            if (contentType.startsWith('image/')) {
                const arrayBuffer = await imageResponse.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const base64 = buffer.toString('base64')
                console.log(`[Scraper] valid image found: ${contentType}, size: ${base64.length}`)
                return `data:${contentType};base64,${base64}`
            }
        }
    } catch (e) {
        console.warn(`[Scraper] Error fetching candidate: ${e}`)
    }
    return null
}

export async function extractImage(html: string, url: string): Promise<string> {
    const candidates: string[] = []

    const og = getOgImage(html)
    if (og) candidates.push(og)

    const json = getJsonLdImage(html)
    if (json) candidates.push(json)

    const bodyImgs = getBodyImages(html)
    candidates.push(...bodyImgs)

    console.log(`[Scraper] Found ${candidates.length} image candidates.`)

    for (const candidate of candidates) {
        const valid = await validateAndFetchImage(candidate, url)
        if (valid) return valid
    }

    if (candidates.length > 0) {
        console.log('[Scraper] Could not fetch any valid image as base64. Returning first candidate as URL fallback.')
        return resolveUrl(candidates[0], url) || candidates[0]
    }

    return ''
}
