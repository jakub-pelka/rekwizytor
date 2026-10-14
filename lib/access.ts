import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export type TheatreRole = 'admin' | 'member' | 'viewer'
export type Access = {
    userId: string | null
    /** Może zapisywać w bieżącym teatrze: kierownik, rekwizytor albo superadmin. Podgląd i niezalogowani nie. */
    canWrite: boolean
    /** Rola w bieżącym teatrze (null: niezalogowany, bez teatru albo baza przed migracją teatrów). */
    role: TheatreRole | null
    isSuperadmin: boolean
}

/**
 * Uprawnienia bieżącego żądania (migracja 20261011_theatres). Odpowiada bazie: can_write_active_theatre
 * to ta sama funkcja, której używają reguły zapisu, więc interfejs nie pokaże przycisku, który i tak by nie zadziałał.
 * Na bazie sprzed migracji: zapis = zalogowany, jak wcześniej.
 */
export async function getAccess(supabase: SupabaseClient<Database>): Promise<Access> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: null, canWrite: false, role: null, isSuperadmin: false }

    const [write, theatre, profile] = await Promise.all([
        supabase.rpc('can_write_active_theatre'),
        supabase.rpc('active_theatre_id'),
        supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
    ])
    const isSuperadmin = profile.data?.role === 'admin' && profile.data?.status === 'approved'
    if (write.error) return { userId: user.id, canWrite: true, role: null, isSuperadmin }

    let role: TheatreRole | null = null
    if (theatre.data) {
        const { data } = await supabase.from('theatre_members').select('role')
            .eq('theatre_id', theatre.data as string).eq('user_id', user.id).maybeSingle()
        role = (data?.role as TheatreRole | undefined) ?? null
    }
    return { userId: user.id, canWrite: !!write.data, role, isSuperadmin }
}
