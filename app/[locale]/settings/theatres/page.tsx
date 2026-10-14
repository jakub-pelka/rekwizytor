import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { TheatresAdmin, type AdminTheatre } from '@/components/settings/TheatresAdmin'

// Teatry i ich zespoły (tylko superadmin). Teatry zakłada administrator aplikacji, potem dodaje kierownika
// pracowni i rekwizytorów po adresie e-mail.
export default async function AdminTheatresPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') redirect('/')

    const [{ data: theatres }, { data: members }, { data: events }, { data: active }] = await Promise.all([
        supabase.from('theatres').select('id, name, is_demo, created_at').order('is_demo').order('name'),
        // Dwa powiązania z profilami (osoba i ten, kto ją dodał): wskazujemy klucze wprost.
        supabase.from('theatre_members')
            .select('theatre_id, user_id, role, invited_at, person:profiles!theatre_members_user_id_fkey(full_name, email, status), inviter:profiles!theatre_members_invited_by_fkey(full_name, email)')
            .order('created_at'),
        supabase.from('theatre_member_events')
            .select('id, theatre_id, action, role, previous_role, user_email, user_name, actor_email, actor_name, created_at')
            .order('created_at', { ascending: false }).limit(200),
        supabase.rpc('active_theatre_id'),
    ])

    const list: AdminTheatre[] = (theatres ?? []).map(th => ({
        id: th.id,
        name: th.name,
        isDemo: th.is_demo,
        members: (members ?? []).filter(m => m.theatre_id === th.id).map(m => ({
            userId: m.user_id,
            role: m.role as 'admin' | 'member' | 'viewer',
            name: m.person?.full_name ?? null,
            email: m.person?.email ?? null,
            invitedAt: m.invited_at,
            invitedBy: m.inviter ? (m.inviter.full_name || m.inviter.email) : null,
        })),
        history: (events ?? []).filter(e => e.theatre_id === th.id).slice(0, 30).map(e => ({
            id: e.id,
            action: e.action as 'added' | 'role_changed' | 'removed' | 'migrated',
            role: e.role as 'admin' | 'member' | 'viewer' | null,
            previousRole: e.previous_role as 'admin' | 'member' | 'viewer' | null,
            who: e.user_name || e.user_email || '',
            by: e.actor_name || e.actor_email || null,
            at: e.created_at,
        })),
    }))

    return <TheatresAdmin theatres={list} currentTheatreId={(active as string | null) ?? null} myId={user.id} />
}
