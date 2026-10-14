import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Nazwa bieżącego teatru (migracja 20261011_theatres). Na bazie sprzed migracji: dawne ustawienie
 * app_settings.theatre_name, żeby kod działał niezależnie od kolejności wdrożenia.
 */
export async function activeTheatreName(supabase: SupabaseClient<Database>): Promise<string | null> {
    const { data: id, error } = await supabase.rpc('active_theatre_id')
    if (!error) {
        if (!id) return null
        const { data } = await supabase.from('theatres').select('name').eq('id', id as string).maybeSingle()
        return data?.name ?? null
    }
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'theatre_name').maybeSingle()
    return data?.value ?? null
}
