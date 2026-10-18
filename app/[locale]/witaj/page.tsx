import { getTranslations } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { WelcomeShell } from '@/components/auth/WelcomeShell'
import { WelcomeForm } from '@/components/auth/WelcomeForm'
import { WelcomeEnd } from '@/components/auth/WelcomeEnd'

type MemberRow = {
    theatre_id: string
    role: string
    joined_at?: string | null
    theatres: { name: string } | null
}

const initialsOf = (value: string) =>
    value
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('')

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

// Ekran z linku zaproszenia. Sesję założył /auth/confirm; bez niej (link wygasł albo został już użyty) pokazujemy, co dalej.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ stan?: string }> }) {
    const { stan } = await searchParams
    const t = await getTranslations('Welcome')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    const inviterName = str(meta.inviter_name)

    if (!user || stan === 'wygasl') {
        return (
            <WelcomeShell>
                <WelcomeEnd kind="expired" inviterName={inviterName} />
            </WelcomeShell>
        )
    }

    const { data: rows } = await supabase
        .from('theatre_members')
        .select('*, theatres(name)')
        .eq('user_id', user.id)
    const members = (rows ?? []) as unknown as MemberRow[]
    // joined_at NULL = zaproszenie czeka. Bez żadnego czekającego członkostwa zaproszenie jest już wykorzystane.
    const pending = members.filter(m => m.joined_at == null)

    if (pending.length === 0) {
        return (
            <WelcomeShell>
                <WelcomeEnd kind="joined" inviterName={inviterName} />
            </WelcomeShell>
        )
    }

    const { data: activeId } = await supabase.rpc('active_theatre_id')
    const member = pending.find(m => m.theatre_id === activeId) ?? pending[0]

    const roleKey = member.role === 'admin' ? 'roleAdmin' : member.role === 'viewer' ? 'roleViewer' : 'roleMember'
    const theatreName = member.theatres?.name ?? str(meta.theatre_name) ?? t('theatreFallback')
    const inviterLine = str(meta.inviter_line) ?? (inviterName ? t('invitedBy', { name: inviterName }) : t('invitedByManager'))

    return (
        <WelcomeShell>
            <WelcomeForm
                theatreName={theatreName}
                inviterLine={inviterLine}
                initials={(inviterName ? initialsOf(inviterName) : '') || 'KP'}
                email={user.email ?? ''}
                roleLabel={t(roleKey)}
            />
        </WelcomeShell>
    )
}
