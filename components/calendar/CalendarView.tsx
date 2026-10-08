'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isSameMonth, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Link } from '@/i18n/routing'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { GROUP_STATUS, statusCountLabel } from '@/components/rk/GroupStatus'
import { EmptyState } from '@/components/rk/EmptyState'
import type { CalendarKind, CalendarTerm, CalendarView as View } from '@/lib/calendar'
import { castLabel, theatreNowNaive, weekdayShort } from '@/lib/rk-format'

type Props = {
    view: View
    kind: CalendarKind
    anchor: string
    prev: string
    next: string
    days: string[]
    terms: CalendarTerm[]
    today: string
    actions?: ReactNode
}

const MAX_IN_CELL = 2

// Kalendarz terminów (karta Kalendarz, ekrany „Kalendarz”, „Kalendarz-miesiac”, „Kalendarz-telefon”).
// Wiersz terminu prowadzi do jego listy zadań; próba bez rekwizytów nie ma listy.
export function CalendarView({ view, kind, anchor, prev, next, days, terms, today, actions }: Props) {
    const t = useTranslations('Calendar')

    // Kreska „teraz” odświeżana co minutę (czas teatru, ten sam układ co terminy).
    const [now, setNow] = useState(() => theatreNowNaive())
    useEffect(() => {
        const id = setInterval(() => setNow(theatreNowNaive()), 60_000)
        return () => clearInterval(id)
    }, [])

    const href = (params: Partial<{ view: View; kind: CalendarKind; date: string }>) => {
        const q = new URLSearchParams({ view, kind, date: anchor, ...params })
        if (q.get('view') === 'list') q.delete('view')
        if (q.get('kind') === 'all') q.delete('kind')
        if (q.get('date') === today && q.get('view') !== 'month') q.delete('date')
        const s = q.toString()
        return `/calendar${s ? `?${s}` : ''}`
    }

    const shown = terms.filter(x => kind === 'all' || x.kind === kind)
    const counts = { all: terms.length, show: terms.filter(x => x.kind === 'show').length, rehearsal: terms.filter(x => x.kind === 'rehearsal').length }

    const anchorDate = parseISO(anchor)
    const title = view === 'month'
        ? capitalize(format(anchorDate, 'LLLL yyyy', { locale: pl }))
        : rangeLabel(parseISO(days[0]), parseISO(days[days.length - 1]))

    const subtitle = (x: CalendarTerm) => (x.kind === 'show'
        ? [x.note ? `${t('show')} ${x.note}` : t('show'), x.venue, x.cast && t('cast', { cast: castLabel(x.cast) ?? '' })]
        : [x.venue, x.note, !x.withProps && t('noProps')]
    ).filter(Boolean).join(' · ')

    const label = (x: CalendarTerm) => (x.kind === 'rehearsal' ? `${x.performanceTitle} · ${x.termTitle || t('rehearsal')}` : x.performanceTitle)
    const target = (x: CalendarTerm) => (x.withProps ? `/lists/${x.id}` : `/performances/${x.performanceId}`)

    const row = (x: CalendarTerm) => (
        <li key={x.id}>
            <Link className={`rk-agenda__row ${x.showDate < now ? 'is-past' : ''}`} href={target(x)}>
                <span className="rk-agenda__time">{x.showDate.slice(11, 16)}</span>
                <span className={`rk-agenda__kind ${x.kind === 'rehearsal' ? 'rk-agenda__kind--rehearsal' : ''}`} title={x.kind === 'rehearsal' ? t('rehearsal') : t('show')} />
                <span className="rk-agenda__main">
                    <b>{label(x)}</b>
                    <small>{subtitle(x)}</small>
                </span>
                <span className="rk-agenda__side">
                    {x.premiere && <span className="rk-badge rk-badge--plain">{t('premiere')}</span>}
                    {x.alert && x.progress?.done === 0 && (
                        <span className={`rk-badge rk-badge--${GROUP_STATUS[x.alert.status].tone} hidden md:inline-flex`}>
                            {statusCountLabel(x.alert.status, x.alert.count)}
                        </span>
                    )}
                    {x.progress && (
                        <span className={`rk-fraction ${x.day === today && x.progress.done < x.progress.total ? 'is-current' : ''} ${x.progress.total > 0 && x.progress.done === x.progress.total ? 'is-done' : ''}`}>
                            {x.progress.done}/{x.progress.total}
                        </span>
                    )}
                </span>
                <ChevronRight />
            </Link>
        </li>
    )

    // --- lista z osią czasu -----------------------------------------------------------------------

    const listView = () => {
        const byDay = days.map(d => ({ day: d, items: shown.filter(x => x.day === d) })).filter(d => d.items.length)
        if (!byDay.length) {
            return <EmptyState art="closed" title={t('emptyTitle')}>{t('emptyText')}</EmptyState>
        }
        const hasToday = byDay.some(d => d.day === today)
        // Najbliższy dzień z terminami po dzisiejszym; gdy dziś nic nie ma, wyróżnienie przechodzi na niego.
        const nextDay = byDay.find(d => d.day > today)?.day
        const markerEnd = byDay.findIndex(d => d.day === (nextDay ?? today))
        return (
            // Na telefonie wartości wariantu .rk-tl--compact z bundle.css (zmienne osi), na komputerze pełny.
            <div className="rk-tl max-md:[--tl-d:40px] max-md:[--tl-g:8px] max-md:[--tl-r:16px]">
                {byDay.map(({ day, items }, i) => {
                    const isToday = day === today
                    const isNext = day === nextDay
                    const later = markerEnd >= 0 && i > markerEnd
                    const date = parseISO(day)
                    const nowIndex = isToday ? items.findIndex(x => x.showDate >= now) : -1
                    return (
                        <div key={day} className="contents">
                            {later && i === markerEnd + 1 && <div className="rk-tl__sep is-later"><span>{t('laterThisWeek')}</span></div>}
                            <section className={`rk-tl__day ${isToday ? 'is-today' : ''} ${isNext ? 'is-next' : ''} ${later ? 'is-later' : ''} ${!isToday && !isNext ? 'rk-tl__day--plain' : ''} ${day < today ? 'is-past' : ''}`}>
                                <div className="rk-tl__date"><small>{weekdayShort(date)}</small><b>{`${date.getDate()}.${date.getMonth() + 1}`}</b></div>
                                <span className="rk-tl__node" aria-hidden="true" />
                                <div className="rk-tl__body">
                                    {isToday && <span className="rk-tl__label">{t('today')}</span>}
                                    {isNext && <span className="rk-tl__label">{hasToday ? t('next') : t('nearest')}</span>}
                                    <ul className="rk-agenda__list">
                                        {items.map((x, j) => (
                                            <FragmentWithNow key={x.id} showNow={isToday && (j === nowIndex || (nowIndex === -1 && j === items.length - 1))} after={nowIndex === -1} now={now} label={t('now')}>
                                                {row(x)}
                                            </FragmentWithNow>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        </div>
                    )
                })}
            </div>
        )
    }

    // --- miesiąc ---------------------------------------------------------------------------------

    const monthView = () => (
        <div className="rk-month" role="grid" aria-label={title}>
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(d => <div key={d} className="rk-month__dow" role="columnheader">{d}</div>)}
            {days.map(d => {
                const date = parseISO(d)
                const items = shown.filter(x => x.day === d)
                return (
                    <div key={d} className={`rk-month__day ${isSameMonth(date, anchorDate) ? '' : 'is-out'} ${d === today ? 'is-today' : ''}`} role="gridcell">
                        <span className="rk-month__n">{date.getDate()}</span>
                        {items.slice(0, MAX_IN_CELL).map(x => (
                            <Link key={x.id} href={target(x)} className={`rk-month__ev rk-month__ev--${x.kind}`} title={`${x.showDate.slice(11, 16)} ${label(x)}`}>
                                <b>{x.showDate.slice(11, 16)}</b>{x.performanceTitle}
                            </Link>
                        ))}
                        {items.length > MAX_IN_CELL && (
                            <Link className="rk-month__more" href={href({ view: 'list', date: d })}>{t('more', { count: items.length - MAX_IN_CELL })}</Link>
                        )}
                    </div>
                )
            })}
        </div>
    )

    const legend = (
        <div className="flex flex-wrap gap-6 text-ink-muted" style={{ font: '400 13px/18px var(--font-sans)' }}>
            <span className="inline-flex items-center gap-2"><span className="rk-agenda__kind" />{t('show')}</span>
            <span className="inline-flex items-center gap-2"><span className="rk-agenda__kind rk-agenda__kind--rehearsal" />{t('rehearsal')}</span>
        </div>
    )

    return (
        <div>
            <MobileTop brand={<MobileBrand />} actions={actions && <span className="md:hidden">{actions}</span>} />
            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <h1 className="rk-page-header__title">{t('title')}</h1>
                    <div className="hidden md:block">{actions}</div>
                </header>

                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    <div className="rk-tabs flex max-md:w-full" role="tablist" aria-label={t('viewLabel')}>
                        {(['list', 'month'] as const).map(v => (
                            <Link key={v} href={href({ view: v, date: v === 'month' ? format(anchorDate, 'yyyy-MM-01') : today })} className={`rk-tab inline-flex items-center justify-center max-md:flex-1 ${v === 'month' ? 'max-md:hidden' : ''}`} role="tab" aria-selected={view === v}>
                                {v === 'list' ? t('viewList') : t('viewMonth')}
                            </Link>
                        ))}
                    </div>
                    <div className="pl-chips" role="group" aria-label={t('filterLabel')}>
                        {(['all', 'show', 'rehearsal'] as const).map(k => (
                            <Link key={k} href={href({ kind: k })} className="rk-chip" aria-pressed={kind === k}>
                                {t(`filter_${k}`)}
                                {counts[k] > 0 && <span className="rk-chip__n">{counts[k]}</span>}
                            </Link>
                        ))}
                    </div>
                    <nav className="flex items-center gap-2 md:ml-auto" aria-label={t('periodLabel')}>
                        <Link className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" href={href({ date: prev })} aria-label={t('prev')}><ChevronLeft /></Link>
                        <span className="min-w-[180px] text-center text-ink" style={{ font: '600 16px/24px var(--font-sans)' }}>{title}</span>
                        <Link className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm" href={href({ date: next })} aria-label={t('next_period')}><ChevronRight /></Link>
                        <Link className="rk-btn rk-btn--ghost rk-btn--sm" href={href({ date: view === 'month' ? format(parseISO(today), 'yyyy-MM-01') : today })}>{t('todayButton')}</Link>
                    </nav>
                </div>

                {view === 'month' ? (
                    <div className="flex flex-col gap-6">{monthView()}{legend}</div>
                ) : (
                    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-12">
                        {listView()}
                        <aside className="hidden md:block">
                            <section className="pl-sect" aria-labelledby="cal-help">
                                <div className="pl-sect-head pl-sect-head--rule"><h2 className="pl-h2" id="cal-help">{t('helpTitle')}</h2></div>
                                {legend}
                                <p className="pl-meta" style={{ font: '400 13px/18px var(--font-sans)' }}>{t('helpAxis')}</p>
                                <p className="pl-meta" style={{ font: '400 13px/18px var(--font-sans)' }}>{t('helpCount')}</p>
                                <p className="pl-meta" style={{ font: '400 13px/18px var(--font-sans)' }}>{t('helpNoProps')}</p>
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    )
}

// Kreska „teraz” (.rk-tl__now) przed pierwszym nadchodzącym terminem dnia albo po ostatnim, gdy wszystkie minęły.
function FragmentWithNow({ children, showNow, after, now, label }: { children: ReactNode; showNow: boolean; after: boolean; now: string; label: string }) {
    const line = <li className="rk-tl__now" aria-label={`${label} ${now.slice(11, 16)}`}><span>{`${label} ${now.slice(11, 16)}`}</span></li>
    return <>{showNow && !after && line}{children}{showNow && after && line}</>
}

function capitalize(s: string) {
    return s.charAt(0).toLocaleUpperCase('pl') + s.slice(1)
}

/** „4–10 października”, „28 września – 4 października”. */
function rangeLabel(from: Date, to: Date) {
    const sameMonth = from.getMonth() === to.getMonth()
    return sameMonth
        ? `${from.getDate()}–${format(to, 'd MMMM', { locale: pl })}`
        : `${format(from, 'd MMMM', { locale: pl })} – ${format(to, 'd MMMM', { locale: pl })}`
}

