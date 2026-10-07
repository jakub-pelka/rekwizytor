import { ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { castLabel, dayMonth, isSameDay, relativeDay, theatreNow, theatreNowNaive, time, weekdayShort } from '@/lib/rk-format'

// Listy zadań od dziś: dzisiejsze na górze, potem najbliższe terminy (wzorce z listy spektakli).
export default async function ListsPage() {
    const supabase = await createClient()
    const t = await getTranslations('Lists')
    const now = theatreNow()

    const { data } = await supabase
        .from('show_lists')
        .select('id, show_date, kind, cast, performance:performances!inner(id, title, venue, deleted_at)')
        .is('performance.deleted_at', null)
        .gte('show_date', theatreNowNaive().slice(0, 10))
        .order('show_date', { ascending: true })
        .limit(30)

    const lists = data ?? []
    const today = lists.filter(l => isSameDay(new Date(l.show_date), now))
    const upcoming = lists.filter(l => !isSameDay(new Date(l.show_date), now))

    const row = (l: typeof lists[number]) => {
        const d = new Date(l.show_date)
        const details = [
            `${relativeDay(d, now)} ${time(d)}`,
            l.kind === 'rehearsal' && t('rehearsal'),
            l.cast && t('cast', { cast: castLabel(l.cast) ?? '' }),
            l.performance.venue,
        ].filter(Boolean).join(' · ')
        return (
            <li key={l.id}>
                <Link className="sl-row" href={`/lists/${l.id}`}>
                    <span className={`pl-date ${isSameDay(d, now) ? 'is-today' : ''}`}>
                        <small>{weekdayShort(d)}</small><b>{dayMonth(d)}</b>
                    </span>
                    <span className="pl-main"><b className="sl-title">{l.performance.title}</b><small>{details}</small></span>
                    <ChevronRight />
                </Link>
            </li>
        )
    }

    const section = (title: string, items: typeof lists) => items.length > 0 && (
        <section className="pl-sect">
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2">{title}</h2>
                <span className="rk-tally">{items.length}</span>
            </div>
            <ul className="pl-list pl-list--date sl-list">{items.map(row)}</ul>
        </section>
    )

    return (
        <div>
            <MobileTop brand={<MobileBrand />} />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
                <h1 className="rk-page-header__title">{t('title')}</h1>
                {section(t('today'), today)}
                {section(t('upcoming'), upcoming)}
                {lists.length === 0 && <p className="text-ink-muted">{t('empty')}</p>}
            </div>
        </div>
    )
}
