import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { InviteShell } from '@/components/auth/invite/InviteShell'
import { InviteFlow, type InviteFlowStart } from '@/components/auth/invite/InviteFlow'
import { lookupInvite } from '@/app/actions/invite-entry'

type MemberRow = {
    theatre_id: string
    joined_at?: string | null
    theatres: { name: string } | null
}

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

// Wejście z zaproszenia kodem. Z sesją i czekającym członkostwem od razu imię i hasło;
// bez sesji: adres z ?email (albo pytamy o e-mail), potem kod.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
    const params = await searchParams
    const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email
    const email = rawEmail?.trim() || ''
    const t = await getTranslations('Welcome')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: rows } = await supabase
            .from('theatre_members')
            .select('*, theatres(name)')
            .eq('user_id', user.id)
        const members = (rows ?? []) as unknown as MemberRow[]
        // joined_at NULL = zaproszenie czeka.
        const pending = members.filter(m => m.joined_at == null)

        if (pending.length > 0) {
            const meta = (user.user_metadata ?? {}) as Record<string, unknown>
            const { data: activeId } = await supabase.rpc('active_theatre_id')
            const member = pending.find(m => m.theatre_id === activeId) ?? pending[0]
            return (
                <InviteShell>
                    <InviteFlow
                        start={{
                            step: 'details',
                            who: {
                                inviterName: str(meta.inviter_name),
                                theatreName: member.theatres?.name ?? str(meta.theatre_name) ?? t('theatreFallback'),
                            },
                            initialName: str(meta.full_name) ?? '',
                        }}
                    />
                </InviteShell>
            )
        }
        // Konto już dołączone i nikt nie podał innego adresu: nie ma tu nic do roboty.
        if (!email) redirect('/')
    }

    let start: InviteFlowStart = { step: 'email' }
    if (email) {
        const res = await lookupInvite(email)
        if (!res.ok) {
            start = { step: 'email', email, error: res.error }
        } else {
            const lookup = res.data
            if (!lookup || lookup.state === 'none') start = { step: 'email', email, notFound: true }
            else if (lookup.state === 'code') start = { step: 'code', email, lookup }
            else start = { step: 'state', lookup, email }
        }
    }

    return (
        <InviteShell>
            <InviteFlow start={start} />
        </InviteShell>
    )
}
