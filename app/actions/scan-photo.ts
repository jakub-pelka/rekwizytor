'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { generateAI, isAIAvailable, logAIUsage, parseAIJson } from '@/utils/ai/client'
import { isAIAllowed } from '@/utils/ai/auth'
import { sanitizeAIOutput } from '@/utils/ai-security'

export type ScanMode = 'groups' | 'items'

/** Ramka w ułamkach zdjęcia (0–1): x, y lewego górnego rogu, szerokość, wysokość. */
export type ScanBox = { x: number; y: number; w: number; h: number }

export type ScanFinding = {
    name: string
    description: string | null
    /** Tylko grupy: przybliżona liczba sztuk. */
    approxCount: number | null
    box: ScanBox | null
    /** Niska pewność: „3?” w ochrze i pozycja niezaznaczona (karta PhotoAI). */
    low: boolean
}

const PROMPTS: Record<ScanMode, string> = {
    groups: `Jesteś asystentem pracowni rekwizytorskiej w teatrze. Na zdjęciu jest półka, szafa albo kufer z rzeczami.
Podziel widoczne rzeczy na GRUPY podobnych przedmiotów (np. „Kielichy złocone”, „Lichtarze mosiężne”).
Dla każdej grupy podaj: krótką nazwę po polsku w liczbie mnogiej, jedno zdanie opisu, przybliżoną liczbę sztuk.`,
    items: `Jesteś asystentem pracowni rekwizytorskiej w teatrze. Wypisz POJEDYNCZE przedmioty widoczne na zdjęciu,
które mogą być rekwizytami (np. „Kielich srebrny”, „Lichtarz mosiężny”). Nazwy po polsku, konkretne, w liczbie pojedynczej.
Dla każdego przedmiotu podaj jedno zdanie opisu (materiał, kolor, stan).`,
}

const FORMAT = `
Dla każdej pozycji podaj też ramkę "box_2d" jako [ymin, xmin, ymax, xmax] w skali 0–1000 względem zdjęcia
oraz "confidence" od 0 do 1 (jak bardzo jesteś pewien rozpoznania).
Odpowiedz wyłącznie JSON:
{"findings": [{"name": string, "description": string, "approx_count": number|null, "box_2d": [number, number, number, number], "confidence": number}]}`

type Raw = { name?: string; description?: string; approx_count?: number | null; box_2d?: number[]; confidence?: number }

/**
 * Jedno rozpoznanie zdjęcia (POMYSLY 14: wspólny komponent skanu zamiast dwóch kopii).
 * Ekran skanu wywołuje je dwa razy naraz, dla grup i dla przedmiotów, a człowiek w tym czasie wybiera tryb.
 */
export async function scanPhoto(imageBase64: string, mode: ScanMode): Promise<{ findings: ScanFinding[] } | { error: string }> {
    if (!isAIAvailable()) return { error: 'Rozpoznawanie zdjęć jest teraz niedostępne.' }
    if (!(await isAIAllowed())) return { error: 'Zaloguj się, żeby rozpoznawać zdjęcia.' }

    try {
        const data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
        const mimeType = /^data:(image\/\w+);base64,/.exec(imageBase64)?.[1] ?? 'image/jpeg'
        const result = await generateAI({ task: 'vision', prompt: PROMPTS[mode] + FORMAT, images: [{ data, mimeType }], json: true })
        await logAIUsage(await createClient(), result, mode === 'groups' ? 'scan_groups' : 'scan_items')

        const parsed = parseAIJson<{ findings?: Raw[] } | Raw[]>(result.text)
        const raw = Array.isArray(parsed) ? parsed : parsed.findings ?? []

        const findings = raw
            .map<ScanFinding | null>(f => {
                const name = sanitizeAIOutput(String(f.name ?? '')).slice(0, 100)
                if (!name) return null
                const b = Array.isArray(f.box_2d) && f.box_2d.length === 4 ? f.box_2d.map(Number) : null
                const box = b && b.every(Number.isFinite)
                    ? { x: clamp(b[1] / 1000), y: clamp(b[0] / 1000), w: clamp((b[3] - b[1]) / 1000), h: clamp((b[2] - b[0]) / 1000) }
                    : null
                return {
                    name,
                    description: f.description ? sanitizeAIOutput(String(f.description)).slice(0, 300) : null,
                    approxCount: mode === 'groups' && Number.isFinite(Number(f.approx_count)) ? Math.max(1, Math.round(Number(f.approx_count))) : null,
                    box: box && box.w > 0 && box.h > 0 ? box : null,
                    low: typeof f.confidence === 'number' ? f.confidence < 0.6 : false,
                }
            })
            .filter((f): f is ScanFinding => f !== null)
            .filter((f, i, all) => all.findIndex(o => o.name.toLowerCase() === f.name.toLowerCase()) === i)

        return { findings }
    } catch (error) {
        console.error('Skan zdjęcia nie powiódł się:', error)
        return { error: 'Nie udało się rozpoznać zdjęcia. Zrób zdjęcie jeszcze raz, przy lepszym świetle.' }
    }
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/** Zapis zatwierdzonych pozycji: grupy (z opisem i liczbą, które dziś ginęły) albo przedmioty luzem w miejscu. */
export async function saveScan(
    mode: ScanMode,
    locationId: string | null,
    findings: { name: string; description: string | null; approxCount: number | null }[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    const supabase = await createClient()
    if (!(await supabase.auth.getUser()).data.user) return { ok: false, error: 'Zaloguj się, żeby zapisywać do magazynu.' }
    if (!findings.length) return { ok: false, error: 'Zaznacz co najmniej jedną pozycję do zapisania.' }

    const { error } = mode === 'groups'
        ? await supabase.from('groups').insert(findings.map(f => ({
            name: f.name, description: f.description, approx_count: f.approxCount, location_id: locationId,
        })))
        : await supabase.from('group_items').insert(findings.map(f => ({
            name: f.name, description: f.description, location_id: locationId,
        })))

    if (error) return { ok: false, error: 'Nie udało się zapisać. Sprawdź połączenie i spróbuj jeszcze raz.' }
    revalidatePath('/[locale]/groups', 'page')
    return { ok: true, count: findings.length }
}
