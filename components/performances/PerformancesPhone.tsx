import { Link } from '@/i18n/routing'
import { ChevronRight, Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { SeasonFilter } from './SeasonFilter'
import { dayMonth, isSameDay, relativeDay, time, weekdayShort } from '@/lib/rk-format'

export type PhonePerformance = {
    id: string
    title: string
    status: string
    premiere_date: string | null
    venue: string | null
    nextShow: { date: string; kind: string } | null
}

type Props = {
    performances: PhonePerformance[]
    seasonLabel: string
    archive: boolean
    canEdit: boolean
}

// Lista spektakli na telefonie (ekran „Spektakle-telefon”).
export async function PerformancesPhone({ performances, seasonLabel, archive, canEdit }: Props) {
    const t = await getTranslations('PerformancesPhone')
    const now = new Date()

    const playing = performances
        .filter(p => p.nextShow || p.status === 'active')
        .sort((a, b) => (a.nextShow?.date ?? '9999').localeCompare(b.nextShow?.date ?? '9999'))
    const inPreparation = performances.filter(p => !p.nextShow && p.status === 'upcoming')

    const row = (p: PhonePerformance) => {
        const next = p.nextShow ? new Date(p.nextShow.date) : null
        let when: string
        if (next) {
            when = `${relativeDay(next, now)} ${time(next)}${p.nextShow?.kind === 'rehearsal' ? ` · ${t('rehearsal')}` : ''}`
        } else if (p.premiere_date && p.status === 'upcoming') {
            when = t('premiere', { date: dayMonth(new Date(p.premiere_date)) })
        } else {
            when = t('noDates')
        }
        return (
            <li key={p.id}>
                <Link className="sl-row" href={`/performances/${p.id}`}>
                    {next ? (
                        <span className={`pl-date ${isSameDay(next, now) ? 'is-today' : ''}`}>
                            <small>{weekdayShort(next)}</small>
                            <b>{dayMonth(next)}</b>
                        </span>
                    ) : (
                        <span className="pl-date" style={{ visibility: 'hidden' }} aria-hidden="true"><small>—</small><b>—</b></span>
                    )}
                    <span className="pl-main">
                        <b className="sl-title">{p.title}</b>
                        <small>{when}{p.venue ? ` · ${p.venue}` : ''}</small>
                    </span>
                    <ChevronRight />
                </Link>
            </li>
        )
    }

    const section = (title: string, items: PhonePerformance[]) => items.length > 0 && (
        <section className="pl-sect">
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2">{title}</h2>
                <span className="rk-tally">{items.length}</span>
            </div>
            <ul className="pl-list pl-list--date sl-list">{items.map(row)}</ul>
        </section>
    )

    return (
        <div className="md:hidden">
            <MobileTop
                brand={<MobileBrand />}
                actions={canEdit && (
                    <Link href="/performances/new" className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('newPerformance')}>
                        <Plus />
                    </Link>
                )}
            />
            <div className="flex flex-col gap-6 px-4 pt-2 pb-6">
                <h1 className="rk-page-header__title">{t('title')}</h1>
                <SeasonFilter seasonLabel={seasonLabel} archive={archive} />
                {archive ? (
                    section(t('archive'), performances)
                ) : (
                    <>
                        {section(t('playing'), playing)}
                        {section(t('inPreparation'), inPreparation)}
                    </>
                )}
                {performances.length === 0 && (
                    <p className="text-ink-muted">{archive ? t('emptyArchive') : t('empty')}</p>
                )}
            </div>
        </div>
    )
}
