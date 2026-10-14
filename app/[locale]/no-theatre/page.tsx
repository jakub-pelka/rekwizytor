import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { EmptyState } from '@/components/rk/EmptyState'

// Konto zatwierdzone, ale bez teatru (migracja 20261011_theatres): baza pokazuje tylko bieżący teatr, więc
// nie ma czego oglądać. Teatr i zespół ustawia administrator aplikacji; tu tylko informacja i wylogowanie.
export default async function NoTheatrePage() {
    const t = await getTranslations('NoTheatre')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
            <EmptyState
                art="closed"
                title={t('title')}
                actions={(
                    <form action={signOut}>
                        <button type="submit" className="rk-btn rk-btn--ghost">{t('signOut')}</button>
                    </form>
                )}
            >
                {t('text', { email: user.email ?? '' })}
            </EmptyState>
        </main>
    )
}
