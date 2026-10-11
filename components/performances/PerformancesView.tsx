import { SharedElement } from '@/components/rk/SharedElement'
import { ChevronRight, Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { GROUP_STATUS, statusCountLabel } from '@/components/rk/GroupStatus'
import { EmptyState } from '@/components/rk/EmptyState'
import type { GroupStatus } from '@/lib/performance-structure'
import { castLabel, dayMonth, isSameDay, plural, relativeDay, time, weekdayShort } from '@/lib/rk-format'
import { SeasonFilter } from './SeasonFilter'

export type ListedPerformance = {
    id: string
    title: string
    status: string
    premiereDate: string | null
    venue: string | null
    poster: string | null
    acts: number
    scenes: number
    props: number
    nextShow: { date: string; kind: string; cast: string | null; note: string | null } | null
    alert: { status: Exclude<GroupStatus, 'available'>; count: number } | null
}

type Props = {
    performances: ListedPerformance[]
    venues: string[]
    venue: string | null
    seasonLabel: string
    archive: boolean
    canEdit: boolean
    now: string
}

// Lista spektakli z plakatem (README, aktualizacja 8.10; karta Plakat; ekrany „Spektakle”, „Spektakle-telefon”).
export async function PerformancesView({ performances, venues, venue, seasonLabel, archive, canEdit, now }: Props) {
    const t = await getTranslations('Performances2')
    const nowDate = new Date(now)

    const shown = performances.filter(p => !venue || p.venue === venue)
    const playing = shown.filter(p => p.status === 'active' || (p.nextShow && p.status !== 'upcoming'))
        .sort((a, b) => (a.nextShow?.date ?? '9999').localeCompare(b.nextShow?.date ?? '9999'))
    const preparing = shown.filter(p => !playing.includes(p))

    const venueHref = (v: string | null) => {
        const q = new URLSearchParams()
        if (archive) q.set('season', 'archive')
        if (v) q.set('venue', v)
        const s = q.toString()
        return `/performances${s ? `?${s}` : ''}`
    }

    const meta = (p: ListedPerformance) => {
        if (p.props === 0 && p.status === 'upcoming') return [p.venue, t('emptyBreakdown')]
        return [
            p.venue,
            p.acts > 0 && plural(p.acts, ['akt', 'akty', 'aktów']),
            p.scenes > 0 && plural(p.scenes, ['scena', 'sceny', 'scen']),
            plural(p.props, ['rekwizyt', 'rekwizyty', 'rekwizytów']),
        ]
    }

    const when = (p: ListedPerformance) => {
        if (p.nextShow) {
            const d = new Date(p.nextShow.date)
            const day = isSameDay(d, nowDate) ? relativeDay(d, nowDate) : `${weekdayShort(d)} ${dayMonth(d)}`
            return {
                label: t('nearest'),
                text: [day, time(d), p.nextShow.cast && t('cast', { cast: castLabel(p.nextShow.cast) ?? '' }), p.nextShow.note].filter(Boolean).join(' · '),
            }
        }
        if (p.premiereDate) {
            const d = new Date(`${p.premiereDate}T00:00:00`)
            return { label: t('premiere'), text: `${weekdayShort(d)} ${dayMonth(d)}` }
        }
        return null
    }

    const badge = (p: ListedPerformance) => {
        if (p.alert) {
            const s = GROUP_STATUS[p.alert.status]
            return <span className={`rk-badge rk-badge--${s.tone}`}>{statusCountLabel(p.alert.status, p.alert.count)}</span>
        }
        if (p.status === 'archived') return <span className="rk-badge">{t('archived')}</span>
        if (p.status === 'upcoming' && !p.nextShow) return <span className="rk-badge rk-badge--plain">{t('preparing')}</span>
        return <span className="rk-badge rk-badge--info">{t('playing')}</span>
    }

    const row = (p: ListedPerformance) => {
        const w = when(p)
        return (
            <li key={p.id}>
                <Link className="sl-row" href={`/performances/${p.id}`}>
                    {p.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <SharedElement name={`show-poster-${p.id}`}><span className="rk-poster"><img src={p.poster} alt="" loading="lazy" /></span></SharedElement>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <SharedElement name={`show-poster-${p.id}`}><span className="rk-poster rk-poster--empty" title={t('noPoster')}><img src="/brand/rekwizytor-znak-mono-bialy.svg" alt="" /></span></SharedElement>
                    )}
                    <span className="pl-main">
                        <b className="sl-title">{p.title}</b>
                        {/* Telefon: najbliższy termin pod tytułem; komputer: metryka, a termin w osobnej kolumnie. */}
                        <small className="md:hidden">{w ? (w.label === t('premiere') ? `${w.label} ${w.text}` : w.text) : meta(p).filter(Boolean).join(' · ')}</small>
                        <small className="hidden md:block">{meta(p).filter(Boolean).join(' · ')}</small>
                    </span>
                    {w && (
                        <span className="sl-when hidden md:block">
                            <span className="rk-tally">{w.label}</span><br />{w.text}
                        </span>
                    )}
                    <span className="hidden md:inline-flex">{badge(p)}</span>
                    <ChevronRight />
                </Link>
            </li>
        )
    }

    const section = (id: string, title: string, items: ListedPerformance[]) => items.length > 0 && (
        <section className="pl-sect" aria-labelledby={id}>
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id={id}>{title}</h2>
                <span className="rk-tally">{plural(items.length, ['spektakl', 'spektakle', 'spektakli'])}</span>
            </div>
            <ul className="pl-list sl-list">{items.map(row)}</ul>
        </section>
    )

    const addButton = canEdit && (
        <Link className="rk-btn rk-btn--primary" href="/performances/new"><Plus />{t('newPerformance')}</Link>
    )

    return (
        <div>
            <MobileTop
                brand={<MobileBrand />}
                actions={canEdit && (
                    <Link href="/performances/new" className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('newPerformance')}><Plus /></Link>
                )}
            />
            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <h1 className="rk-page-header__title">{t('title')}</h1>
                    <div className="hidden md:block">{addButton}</div>
                </header>

                <div className="flex flex-wrap items-center gap-3 md:justify-between">
                    <div className="w-full md:order-2 md:w-auto"><SeasonFilter seasonLabel={seasonLabel} archive={archive} /></div>
                    {venues.length > 1 && (
                        <div className="pl-chips md:order-1" role="group" aria-label={t('venue')}>
                            <Link className="rk-chip" href={venueHref(null)} aria-pressed={!venue}>
                                {t('allVenues')}<span className="rk-chip__n">{performances.length}</span>
                            </Link>
                            {venues.map(v => (
                                <Link key={v} className="rk-chip max-md:hidden" href={venueHref(v)} aria-pressed={venue === v}>{v}</Link>
                            ))}
                        </div>
                    )}
                </div>

                {archive ? section('pf-archive', t('archive'), shown) : (
                    <>
                        {section('pf-playing', t('playingSection'), playing)}
                        {section('pf-preparing', t('preparingSection'), preparing)}
                    </>
                )}
                {shown.length === 0 && (
                    <EmptyState art="closed" title={archive ? t('emptyArchiveTitle') : t('emptyTitle')} actions={!archive && addButton}>
                        {archive ? t('emptyArchiveText') : t('emptyText')}
                    </EmptyState>
                )}
            </div>
        </div>
    )
}
