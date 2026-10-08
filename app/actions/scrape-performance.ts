'use server'

import { createClient } from '@/utils/supabase/server'

export type ScrapedPerformanceData = {
    title: string
    description: string
    dates: string[] // To be added as scheduled shows
    premiereDate?: string
    imageUrl?: string
}

export type ScrapeResult = {
    success: boolean
    data?: ScrapedPerformanceData
    error?: string
}

import {
    cleanHtmlContent,
    extractTitle,
    extractPremiereDate,
    extractShowDates,
    extractDescription,
    extractImage
} from './scraper-utils'

export async function scrapePerformance(url: string): Promise<ScrapeResult> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`)
        }

        const html = await response.text()
        const cleanHtml = cleanHtmlContent(html)

        const title = extractTitle(html, cleanHtml)
        const premiereDate = extractPremiereDate(cleanHtml)
        const dates = extractShowDates(html)
        const description = extractDescription(html)
        const imageUrl = await extractImage(html, url)

        return {
            success: true,
            data: {
                title,
                description,
                dates,
                premiereDate,
                imageUrl
            },
        }
    } catch (error) {
        console.error('Scraping error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown scraping error'
        }
    }
}



export async function refreshSinglePerformance(performanceId: string, sourceUrl: string) {
    const supabase = await createClient()

    // 1. Scrape
    const result = await scrapePerformance(sourceUrl)
    if (!result.success || !result.data?.dates) {
        return { success: false, error: result.error || 'No dates found' }
    }

    const scrapedDates = result.data.dates
    if (scrapedDates.length === 0) return { success: true, added: 0 }

    // 2. Get existing shows
    const { data: existingShows } = await supabase
        .from('scene_checklists')
        .select('show_date')
        .eq('performance_id', performanceId)
        .eq('type', 'show')

    const existingDateStrings = new Set(existingShows?.map((s: { show_date: string }) => new Date(s.show_date).toISOString().split('T')[0]) || [])

    // 3. Filter new dates
    const newDates = scrapedDates.filter(dateStr => {
        // Scraper returns ISO strings like 2024-03-30T19:00:00
        // We compare by YYYY-MM-DD to be safe
        const d = new Date(dateStr).toISOString().split('T')[0]
        return !existingDateStrings.has(d)
    })

    if (newDates.length === 0) return { success: true, added: 0 }

    // 4. Insert new shows
    // We need to know the "Act 1, Scene 1" equivalent for this performance to create a valid checklist?
    // In CreatePerformanceForm we defaulted to Scene 1.
    // Let's try to find the first scene of Act 1.

    const { data: firstScene } = await supabase
        .from('scenes')
        .select('id, scene_number, name')
        .eq('performance_id', performanceId)
        .order('act_number', { ascending: true })
        .order('scene_number', { ascending: true })
        .limit(1)
        .single()

    const sceneNum = firstScene?.scene_number?.toString() || '1'
    const sceneName = firstScene?.name || 'Scene 1'

    const checklistsToInsert = newDates.map(dateStr => ({
        performance_id: performanceId,
        show_date: dateStr,
        scene_number: sceneNum,
        scene_name: sceneName,
        type: 'show',
        is_active: false
    }))

    const { error } = await supabase
        .from('scene_checklists')
        .insert(checklistsToInsert)

    if (error) {
        console.error(`Error adding shows for ${performanceId}:`, error)
        return { success: false, error: error.message }
    }

    // Terminy trafiają też do nowego modelu (kalendarz i listy zadań).
    await supabase.from('show_lists').upsert(
        newDates.map(dateStr => ({ performance_id: performanceId, show_date: dateStr, kind: 'show' })),
        { onConflict: 'performance_id,show_date', ignoreDuplicates: true },
    )

    return { success: true, added: newDates.length }
}

export async function refreshAllPerformances() {
    const supabase = await createClient()

    // 1. Get all performances with source_url
    const { data: performances } = await supabase
        .from('performances')
        .select('id, source_url, title')
        .not('source_url', 'is', null)
        .neq('source_url', '')

    if (!performances || performances.length === 0) {
        return { success: true, refreshed: 0, details: [] }
    }

    const results = []

    // 2. Iterate and refresh (sequentially to avoid rate limits/overload)
    for (const perf of performances) {
        if (!perf.source_url) continue

        try {
            const res = await refreshSinglePerformance(perf.id, perf.source_url)
            results.push({
                title: perf.title,
                success: res.success,
                added: res.added || 0,
                error: res.error
            })
        } catch (e) {
            results.push({
                title: perf.title,
                success: false,
                error: String(e)
            })
        }
    }

    return { success: true, refreshed: results.filter(r => r.success).length, details: results }
}
