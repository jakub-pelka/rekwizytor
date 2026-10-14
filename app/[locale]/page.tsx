import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { getTranslations } from 'next-intl/server'
import { Eye } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { AccountMenuButton } from '@/components/rk/AccountMenuButton'
import { SearchButton } from '@/components/rk/SearchButton'
import { StatusBanner } from '@/components/rk/StatusBanner'
import { PendingUsersAlert } from '@/components/dashboard/PendingUsersAlert'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { loadDashboard } from '@/lib/dashboard'
import { activeTheatreName } from '@/lib/theatre'
import { dayMonth, theatreNow, theatreNowNaive, weekdayShort } from '@/lib/rk-format'

export default async function Home() {
    const supabase = await createClient()
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)
    const { data: { user } } = await supabase.auth.getUser()
    const t = await getTranslations('DashboardB')

    const [data, theatre] = await Promise.all([
        loadDashboard(supabase, user?.id ?? null),
        activeTheatreName(supabase),
    ])
    const today = theatreNow()

    return (
        <>
            {user ? <PendingUsersAlert /> : (
                // Te same odstępy co treść pulpitu (DashboardView: px-4, na komputerze md:px-12).
                <div className="mx-auto w-full max-w-[1184px] px-4 pt-4 md:px-12 md:pt-8">
                    <StatusBanner
                        tone="readonly"
                        icon={<Eye />}
                        side={<Link className="rk-btn rk-btn--ghost rk-btn--sm" href="/login">{t('signIn')}</Link>}
                    >
                        {t('readonly')}
                    </StatusBanner>
                </div>
            )}
            <MobileTop
                brand={<MobileBrand date={`${weekdayShort(today)} · ${dayMonth(today)}`} />}
                actions={
                    <>
                        <SearchButton />
                        <AccountMenuButton />
                    </>
                }
            />
            <DashboardView data={data} now={theatreNowNaive()} canEdit={access.canWrite} theatreName={theatre ?? undefined} />
        </>
    )
}
