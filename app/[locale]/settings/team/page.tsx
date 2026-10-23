import { redirect } from 'next/navigation'
import { loadTeam } from '@/lib/team'
import { TeamView } from '@/components/team/TeamView'

// Zespół teatru (plansze „Zespół”, „Zespół-telefon”, „Zespół-akcje”): kierownik zaprasza, zmienia role i usuwa;
// rekwizytor i podgląd widzą tę samą listę bez akcji.
export default async function TeamPage() {
    const data = await loadTeam()
    if (!data) return redirect('/login')
    return <TeamView data={data} />
}
