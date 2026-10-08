import { redirect } from 'next/navigation'
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
    const [settingsResult, members, pending, scans] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'theatre_name').maybeSingle(),
        isAdmin ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved') : Promise.resolve({ count: 0 }),
        isAdmin ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
        isAdmin ? supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', month.toISOString()) : Promise.resolve({ count: null }),
    ])

    return (
        <SettingsView
            userId={user.id}
            name={profile?.full_name ?? ''}
            email={user.email ?? ''}
            roleLabel={roleLabel}
            isAdmin={isAdmin}
            theatreName={settingsResult.data?.value ?? ''}
            team={{ members: members.count ?? 0, pending: pending.count ?? 0 }}
            aiScans={isAdmin ? scans.count ?? 0 : null}
            version={pkg.version}
        />
    )
}
