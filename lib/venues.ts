import type { SupabaseClient } from '@supabase/supabase-js'

// Sceny już użyte w spektaklach: ten sam napis bez względu na wielkość liter i odstępy to jedna scena
// (pokazujemy najczęstszy zapis). Zasila listę wyboru w formularzu spektaklu.
export async function loadVenues(supabase: SupabaseClient): Promise<string[]> {
    const { data } = await supabase.from('performances').select('venue').is('deleted_at', null)
    const forms = new Map<string, Map<string, number>>()
    for (const { venue } of (data ?? []) as { venue: string | null }[]) {
        const label = venue?.trim().replace(/\s+/g, ' ')
        if (!label) continue
        const key = label.toLocaleLowerCase('pl')
        const counts = forms.get(key) ?? new Map<string, number>()
        counts.set(label, (counts.get(label) ?? 0) + 1)
        forms.set(key, counts)
    }
    return [...forms.values()]
        .map(counts => [...counts].sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b, 'pl'))[0][0])
        .sort((a, b) => a.localeCompare(b, 'pl'))
}
