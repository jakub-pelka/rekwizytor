import { redirect } from 'next/navigation'
import { activeTheatreName } from '@/lib/theatre'
import { plural, seasonOf, theatreNow } from '@/lib/rk-format'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { SettingsView } from '@/components/settings/SettingsView'
import pkg from '@/package.json'

// Ustawienia (README, aktualizacja 8.10; karta Ustawienia): konto, wygląd, listy rekwizytów, teatr (administrator), o aplikacji.
export default async function SettingsPage() {
    const supabase = await createClient()
    const t = await getTranslations('SettingsPage')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'
    const roleLabel = ({ admin: t('roleAdmin'), manager: t('roleManager'), user: t('roleUser') } as Record<string, string>)[profile?.role ?? 'user'] ?? ''

    const month = new Date()
    month.setDate(1)
    month.setHours(0, 0, 0, 0)
    // Nazwa i zespół bieżącego teatru (migracja 20261011_theatres); baza zwraca tylko jego wiersze.
    const { data: activeTheatreId } = await supabase.rpc('active_theatre_id')
    const theatreName = await activeTheatreName(supabase)
    // Kierownik pracowni bieżącego teatru (theatre_members.role = 'admin') widzi sekcję Teatr i zespół.
    let canManageTeam = isAdmin
    if (!isAdmin && activeTheatreId) {
        const { data: membership } = await supabase.from('theatre_members').select('role').eq('user_id', user.id).eq('theatre_id', activeTheatreId as string).maybeSingle()
        canManageTeam = membership?.role === 'admin'
    }
    const showTheatre = isAdmin || canManageTeam
    const [members, pending, shows, scans] = await Promise.all([
        showTheatre && activeTheatreId
            ? supabase.from('theatre_members').select('user_id', { count: 'exact', head: true }).eq('theatre_id', activeTheatreId as string)
            : Promise.resolve({ count: 0 }),
        // Zaproszenia czekające na przyjęcie w tym teatrze (joined_at NULL).
        showTheatre && activeTheatreId
            ? supabase.from('theatre_members').select('user_id', { count: 'exact', head: true }).eq('theatre_id', activeTheatreId as string).is('joined_at', null)
            : Promise.resolve({ count: 0 }),
        showTheatre ? supabase.from('performances').select('id', { count: 'exact', head: true }).is('deleted_at', null).neq('status', 'archived') : Promise.resolve({ count: 0 }),
        isAdmin ? supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', month.toISOString()) : Promise.resolve({ count: null }),
    ])

    return (
        <SettingsView
            userId={user.id}
            name={profile?.full_name ?? ''}
            email={user.email ?? ''}
            roleLabel={roleLabel}
            isAdmin={isAdmin}
            canManageTeam={canManageTeam}
            theatreName={theatreName ?? ''}
            theatreMeta={`${seasonOf(theatreNow()).label} · ${plural(shows.count ?? 0, ['spektakl', 'spektakle', 'spektakli'])}`}
            team={{ members: members.count ?? 0, pending: pending.count ?? 0 }}
            aiScans={isAdmin ? scans.count ?? 0 : null}
            version={pkg.version}
        />
    )
}
