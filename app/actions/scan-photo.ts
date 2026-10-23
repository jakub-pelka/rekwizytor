'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { generateAI, isAIAvailable, parseAIJson } from '@/utils/ai/client'
import { AIBudgetExceededError } from '@/utils/ai/budget'
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

// Modele do rozpoznawania zdjęć: Haiku jest główny (najlepsze nazwy i ramki na wzorcu z 9.10), Gemini to zapas
// od innego dostawcy, szybszy, ale znajduje mniej. Nadpisanie: AI_MODEL_SCAN (lista po przecinku).
const SCAN_MODELS = (process.env.AI_MODEL_SCAN ?? 'anthropic/claude-haiku-5.5,google/gemini-3.5-flash-lite')
    .split(',').map(m => m.trim()).filter(Boolean)
/** Gęste zdjęcie to kilkadziesiąt pozycji; przy 4096 tokenów JSON się urywał, a cały wynik przepadał. */
const SCAN_MAX_TOKENS = 16000
/** Po tym czasie próbujemy kolejnego modelu. */
const SCAN_TIMEOUT_MS = 45_000

/**
 * Format ramek zależy od modelu. Gemini jest trenowany na `box_2d` (0–1000, najpierw oś pionowa).
 * Claude lepiej trzyma się pikseli: proszony o 0–1000 w 3 z 9 odpowiedzi i tak podawał piksele, a proszony
 * o piksele trzymał się ich w 18 z 18 (wzorzec Kuby, 9.10).
 */
type BoxFormat = 'pixels' | 'box_2d'
const boxFormat = (model: string): BoxFormat => (model.startsWith('anthropic/') ? 'pixels' : 'box_2d')

// Wspólny opis zdjęć i tego, co jest rzeczą do spisu. „Tylko pewne” zamiast „lepiej za dużo”: na wzorcu
// o 40% mniej pozycji spoza zdjęcia przy jednej trafionej mniej.
const CONTEXT = `Jesteś asystentem pracowni rekwizytorskiej w teatrze. Robisz spis rzeczy z magazynu rekwizytów.

Jak wyglądają zdjęcia: robione telefonem w magazynie teatru. Bywa ciemno, część rzeczy jest w cieniu, nieostra albo częściowo zasłonięta. Rzeczy leżą chaotycznie, jedna na drugiej, wiszą na ścianach, siatkach i hakach, a obok siebie stoją przedmioty zupełnie niepasujące do siebie tematycznie (np. automat do gum obok złotej ramy). To normalne, nie szukaj w zdjęciu jednego tematu.

Co NIE jest rzeczą do spisu: ściany, podłoga, sufit, instalacje (rury, lampy sufitowe, gniazdka, płyty izolacji) oraz wyposażenie samego magazynu: regały, stałe szafy, siatki i stelaże, na których rzeczy wiszą lub leżą. Spisz rzeczy, które da się rozpoznać, także wiszące i stojące w głębi.

Jak przeglądać: przejdź zdjęcie strefami, kolejno: górny pas, środek lewy, środek prawy, dół lewy, dół prawy, a na końcu głąb kadru. Każdą rzecz wypisz tylko raz.`

const PROMPTS: Record<ScanMode, string> = {
    items: `${CONTEXT}

Zasady spisu:
- wypisz TYLKO rzeczy, które naprawdę widzisz i potrafisz nazwać; nie zgaduj z drobnych fragmentów, odblasków ani plam; lepiej pominąć niż wymyślić;
- każda sztuka osobno, każdą rzecz tylko raz;
- nazwa po polsku, w liczbie pojedynczej, 1–4 słowa: rzeczownik i cecha odróżniająca (np. „Rama owalna złota”);
- opis 1–3 słowa: cecha odróżniająca; bez zgadywania przeznaczenia;
- ramka obejmuje całą widoczną rzecz i nic więcej.`,
    groups: `${CONTEXT}

Podziel widoczne rzeczy na GRUPY podobnych przedmiotów (np. „Kielichy złocone”, „Lampiony czerwone”), tak jak ułożyłby je rekwizytor w magazynie.
Uwzględnij TYLKO rzeczy, które naprawdę widzisz i potrafisz nazwać; nie zgaduj z drobnych fragmentów ani plam.
Dla każdej grupy podaj: nazwę po polsku w liczbie mnogiej (1–4 słowa), opis w 1–3 słowach i przybliżoną liczbę sztuk.
Rzeczy samotne, niepasujące do żadnej grupy, podaj jako grupy jednoelementowe.`,
}

const FORMATS: Record<BoxFormat, (w: number, h: number) => string> = {
    box_2d: () => `
Dla każdej pozycji podaj "box_2d" jako [ymin, xmin, ymax, xmax] w skali 0–1000 względem zdjęcia (najpierw oś pionowa, potem pozioma) oraz "confidence" od 0 do 1 (jak bardzo jesteś pewien rozpoznania).
Odpowiedz wyłącznie JSON:
{"findings": [{"name": string, "description": string, "approx_count": number|null, "box_2d": [number, number, number, number], "confidence": number}]}`,
    pixels: (w, h) => `
Zdjęcie ma ${w} px szerokości i ${h} px wysokości. Dla każdej pozycji podaj "box" jako [x_min, y_min, x_max, y_max] w pikselach tego zdjęcia (x liczony od lewej krawędzi, y od górnej) oraz "confidence" od 0 do 1 (jak bardzo jesteś pewien rozpoznania).
Odpowiedz wyłącznie JSON:
{"findings": [{"name": string, "description": string, "approx_count": number|null, "box": [number, number, number, number], "confidence": number}]}`,
}

type Raw = { name?: string; description?: string; approx_count?: number | null; box_2d?: number[]; box?: number[]; confidence?: number }

/**
 * Jedno rozpoznanie zdjęcia (POMYSLY 14: wspólny komponent skanu zamiast dwóch kopii).
 * Ekran skanu wywołuje je dwa razy naraz, dla grup i dla przedmiotów, a człowiek w tym czasie wybiera tryb.
 */
/** Rozmiar zdjęcia wysłanego do modelu (ekran skanu zna go po zmniejszeniu). */
export type ScanImageSize = { width: number; height: number }

/** Ramka z odpowiedzi modelu w ułamkach zdjęcia, według formatu, o który go prosiliśmy. */
function readBox(f: Raw, format: BoxFormat, { width, height }: ScanImageSize): ScanBox | null {
    let y0: number, x0: number, y1: number, x1: number
    if (format === 'pixels') {
        const b = Array.isArray(f.box) && f.box.length === 4 ? f.box.map(Number) : null
        if (!b || !b.every(Number.isFinite)) return null
        ;[x0, y0, x1, y1] = [b[0] / width, b[1] / height, b[2] / width, b[3] / height]
    } else {
        const b = Array.isArray(f.box_2d) && f.box_2d.length === 4 ? f.box_2d.map(Number) : null
        if (!b || !b.every(Number.isFinite)) return null
        // Zabezpieczenie: liczby ponad 1000 znaczą, że model mimo prośby podał piksele.
        const pixels = Math.max(...b) > 1000
        ;[y0, x0, y1, x1] = pixels ? [b[0] / height, b[1] / width, b[2] / height, b[3] / width] : b.map(v => v / 1000)
    }
    const x = clamp(Math.min(x0, x1)), y = clamp(Math.min(y0, y1))
    const w = clamp(Math.max(x0, x1)) - x, h = clamp(Math.max(y0, y1)) - y
    return w > 0 && h > 0 ? { x, y, w, h } : null
}

const overlap = (a: ScanBox, b: ScanBox) => {
    const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
    const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    return (w * h) / (a.w * a.h + b.w * b.h - w * h || 1)
}

/**
 * Jedno rozpoznanie zdjęcia (POMYSLY 14: wspólny komponent skanu zamiast dwóch kopii).
 * Ekran skanu wywołuje je dwa razy naraz, dla grup i dla przedmiotów, a człowiek w tym czasie wybiera tryb.
 * Modele próbujemy po kolei, bo każdy dostaje prompt we własnym formacie ramek.
 */
export async function scanPhoto(imageBase64: string, mode: ScanMode, size: ScanImageSize): Promise<{ findings: ScanFinding[] } | { error: string }> {
    if (!isAIAvailable()) return { error: 'Rozpoznawanie zdjęć jest teraz niedostępne.' }
    if (!(await isAIAllowed())) return { error: 'Zaloguj się, żeby rozpoznawać zdjęcia.' }

    const data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = /^data:(image\/\w+);base64,/.exec(imageBase64)?.[1] ?? 'image/jpeg'

    for (const model of SCAN_MODELS) {
        const format = boxFormat(model)
        try {
            const result = await generateAI({
                task: 'vision', operation: mode === 'groups' ? 'scan_groups' : 'scan_items', prompt: PROMPTS[mode] + FORMATS[format](size.width, size.height), images: [{ data, mimeType }], json: true,
                models: [model], maxTokens: SCAN_MAX_TOKENS, timeoutMs: SCAN_TIMEOUT_MS,
            })

            const parsed = parseAIJson<{ findings?: Raw[] } | Raw[]>(result.text)
            const raw = Array.isArray(parsed) ? parsed : parsed.findings ?? []

            const findings: ScanFinding[] = []
            for (const f of raw) {
                const name = sanitizeAIOutput(String(f.name ?? '')).slice(0, 100)
                if (!name) continue
                const box = readBox(f, format, size)
                // Dubel to ta sama nazwa w prawie tym samym miejscu; trzy lampiony obok siebie zostają trzema pozycjami.
                if (findings.some(o => o.name.toLowerCase() === name.toLowerCase() && (!box || !o.box || overlap(o.box, box) > 0.6))) continue
                findings.push({
                    name,
                    description: f.description ? sanitizeAIOutput(String(f.description)).slice(0, 300) : null,
                    approxCount: mode === 'groups' && Number.isFinite(Number(f.approx_count)) ? Math.max(1, Math.round(Number(f.approx_count))) : null,
                    box,
                    low: typeof f.confidence === 'number' ? f.confidence < 0.6 : false,
                })
            }
            return { findings }
        } catch (error) {
            if (error instanceof AIBudgetExceededError) return { error: error.message }
            console.error(`Skan zdjęcia (${model}) nie powiódł się:`, error)
        }
    }
    return { error: 'Nie udało się rozpoznać zdjęcia. Zrób zdjęcie jeszcze raz, przy lepszym świetle.' }
}

/**
 * Oba rozpoznania (grupy i przedmioty) w jednej akcji serwera, równolegle. Next.js wykonuje akcje wywołane
 * z przeglądarki po kolei, więc dwa osobne wywołania trwały razem ok. 27 s zamiast ok. 13 s (logi z 9.10).
 */
export async function scanPhotoBoth(imageBase64: string, size: ScanImageSize) {
    const [groups, items] = await Promise.all([scanPhoto(imageBase64, 'groups', size), scanPhoto(imageBase64, 'items', size)])
    return { groups, items }
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
