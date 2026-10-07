'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Numer z etykiety albo wpisany ręcznie (GRP-0012, REK-0142, MSC-0021, dawny kod z linku QR)
 * zamieniamy na ekran do otwarcia. Zwraca ścieżkę bez prefiksu języka albo null, gdy nic nie pasuje.
 */
export async function resolveCode(raw: string): Promise<string | null> {
    const supabase = await createClient()
    const text = raw.trim()
    const link = /\/g\/([A-Za-z0-9]+)/.exec(text)?.[1]
    const code = text.toUpperCase().replace(/\s+/g, '')

    if (link || !/^(GRP|REK|MSC)-?\d+$/.test(code)) {
        const { data } = await supabase.from('groups').select('id').eq('short_id', link ?? text).maybeSingle()
        return data ? `/groups/${data.id}` : null
    }

    const normalized = code.includes('-') ? code : `${code.slice(0, 3)}-${code.slice(3)}`
    if (normalized.startsWith('GRP')) {
        const { data } = await supabase.from('groups').select('id').eq('code', normalized).maybeSingle()
        return data ? `/groups/${data.id}` : null
    }
    if (normalized.startsWith('REK')) {
        const { data } = await supabase.from('group_items').select('id, group_id, location_id').eq('code', normalized).maybeSingle()
        if (data?.group_id) return `/groups/${data.group_id}?highlight=${data.id}`
        // Przedmiot luzem: otwieramy pomieszczenie, w którym leży, i podświetlamy go na liście.
        if (data?.location_id) {
            const { data: place } = await supabase.from('locations').select('id, belongs_to').eq('id', data.location_id).maybeSingle()
            let room = place
            for (let i = 0; i < 6 && room?.belongs_to; i++) {
                room = (await supabase.from('locations').select('id, belongs_to').eq('id', room.belongs_to).maybeSingle()).data
            }
            return `/groups?room=${room?.id ?? data.location_id}&highlight=${data.id}`
        }
        return data ? '/groups' : null
    }
    const { data } = await supabase.from('locations').select('id').eq('code', normalized).maybeSingle()
    return data ? `/groups?room=${data.id}` : null
}
