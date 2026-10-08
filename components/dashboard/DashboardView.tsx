import { Camera, Check, ChevronRight, FileText, Mail, Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ShowTitle } from '@/components/rk/ShowTitle'
import { GROUP_STATUS, statusCountLabel } from '@/components/rk/GroupStatus'
import { RkAvatar, avatarFor } from '@/components/rk/RkAvatar'
import { EmptyState } from '@/components/rk/EmptyState'
import { BlockingList } from './BlockingList'
import type { DashboardData, DashboardHero } from '@/lib/dashboard'
import type { StageProgress } from '@/lib/performance-structure'
import {
    dayMonth, duration, isSameDay, longDate, plural, relativeDay, theatreDate, time, weekdayShort, whenShort,
} from '@/lib/rk-format'

type Props = { data: DashboardData; now: string; canEdit: boolean; theatreName?: string }

// Pulpit („Main-B”, „Pulpit-bez”, „Telefon-B”): najbliższy spektakl, ten tydzień, magazyn, zmiany i wzmianki.
export async function DashboardView({ data, now, canEdit, theatreName }: Props) {
    const t = await getTranslations('DashboardB')
    const nowDate = new Date(now)
    const { hero, isToday, week, storage, activity, mentions } = data
    const firstRun = !hero && storage.total === 0

    return (
        <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
            <header className="rk-page-header hidden flex-wrap items-center border-b-0 pb-0 md:flex">
                <div>
                    <p className="rk-page-header__eyebrow">{theatreName ? t('eyebrowTheatre', { date: longDate(nowDate), theatre: theatreName }) : longDate(nowDate)}</p>
                    <h1 className="rk-page-header__title">{t('title')}</h1>
                </div>
                {canEdit && (
                    // Na komputerze bez skanowania (zasada przycisków, karta Button): skanuje się telefonem.
                    <Link className="rk-btn rk-btn--primary" href="/groups?create=1"><Plus />{t('addProp')}</Link>
                )}
            </header>

            <div className="flex flex-col gap-8 md:gap-12">
                <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:items-start md:gap-12">
                    {hero ? <Hero hero={hero} isToday={isToday} now={nowDate} t={t} /> : firstRun ? (
                        <FirstRunHero t={t} canEdit={canEdit} />
                    ) : (
                        <section className="pl-hero md:flex-[2_1_560px]">
                            <EmptyState art="closed" title={t('noShowsTitle')} actions={canEdit && (
                                <Link className="rk-btn rk-btn--secondary" href="/performances">{t('noShowsAction')}</Link>
                            )}>{t('noShows')}</EmptyState>
                        </section>
                    )}

                    {/* Na telefonie magazyn stoi przed tygodniem (makieta „Telefon-B”). */}
                    {!firstRun && <div className="md:hidden"><Storage storage={storage} t={t} grid /></div>}

                    {firstRun ? <FirstRunAside t={t} /> : (
                    <section className="pl-sect md:flex-[1_1_280px]" aria-labelledby="db-week">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2" id="db-week">{t('week')}</h2>
                            <span className="pl-count">{plural(week.length, ['spektakl', 'spektakle', 'spektakli'])}</span>
                        </div>
                        {week.length > 0 ? (
                            <ul className="pl-list pl-list--date">
                                {week.map(w => {
                                    const d = new Date(w.showDate)
                                    const premiere = w.premiereDate === w.showDate.slice(0, 10)
                                    const firstBlocking = w.blocking[0]?.group
                                    return (
                                        <li key={w.listId}>
                                            <span className={`pl-date ${isSameDay(d, nowDate) ? 'is-today' : ''}`}>
                                                <small>{weekdayShort(d)}</small><b>{dayMonth(d)}</b>
                                            </span>
                                            <Link className="pl-main" href={`/lists/${w.listId}`}>
                                                <b>{w.title}</b>
                                                <small>{[time(d), w.venue].filter(Boolean).join(' · ')}</small>
                                            </Link>
                                            {premiere ? <span className="rk-badge rk-badge--plain">{t('premiere')}</span>
                                                : firstBlocking && firstBlocking.status !== 'available' && w.done === 0 && !isSameDay(d, nowDate)
                                                    ? <span className={`rk-badge rk-badge--${GROUP_STATUS[firstBlocking.status].tone}`}>
                                                        {statusCountLabel(firstBlocking.status, w.blocking.length)}
                                                    </span>
                                                    : <span className="pl-stage__n">{w.done}/{w.total}</span>}
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : <p className="pl-meta">{t('weekEmpty')}</p>}
                        <Link className="pl-link" href="/performances">{t('calendar')}<ChevronRight /></Link>
                    </section>
                    )}
                </div>

                {!firstRun && <div className="hidden md:block"><Storage storage={storage} t={t} /></div>}

                <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:items-start md:gap-12">
                    <section className="pl-sect md:flex-[1_1_380px]" aria-labelledby="db-log">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2" id="db-log">{t('activity')}</h2>
                        </div>
                        {activity.length > 0 ? (
                            <ul className="pl-list pl-list--media">
                                {activity.map(a => (
                                    <li key={a.id} className="!items-start">
                                        {a.who && <RkAvatar name={avatarFor(a.who.id)} size={32} />}
                                        <span className="pl-main">
                                            <p>
                                                {a.who && <b>{a.who.name} · </b>}
                                                {t('activityChecked', { prop: a.prop, title: a.title })}
                                            </p>
                                        </span>
                                        <span className="pl-time">{whenShort(theatreDate(a.at), nowDate)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="pl-meta">{t('activityEmpty')}</p>}
                    </section>

                    {mentions.length > 0 && (
                        <section className="pl-sect md:flex-[1_1_380px]" aria-labelledby="db-at">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <h2 className="pl-h2" id="db-at">{t('mentions')}</h2>
                                <span className="rk-count rk-count--new" aria-label={t('newCount', { count: mentions.length })}>{mentions.length}</span>
                            </div>
                            <ul className="pl-list">
                                {mentions.map(m => (
                                    <li key={m.id} className="!items-start">
                                        <Link className="pl-main" href={`/notes/${m.noteId}`}>
                                            <small>{t('inNote', { title: m.noteTitle })}</small>
                                        </Link>
                                        <span className="pl-time">{whenShort(theatreDate(m.at), nowDate)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}

type T = Awaited<ReturnType<typeof getTranslations<'DashboardB'>>>

function Hero({ hero, isToday, now, t }: { hero: DashboardHero; isToday: boolean; now: Date; t: T }) {
    const d = new Date(hero.showDate)
    const startsIn = d.getTime() - now.getTime()
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
    const eyebrow = [!isToday && t('notPlayingToday'), t('nearest')].filter(Boolean).join(' · ')
    const when = `${relativeDay(d, now)}, ${time(d)}`
    const blockingCount = hero.blocking.length
    const crewNames = hero.crew.map(c => c.name.split(' ')[0]).join(', ')

    const stageMeta = (p: StageProgress) => {
        if (p.complete) return hero.previousClosedAt && p.stage === 'rehearsal'
            ? t('closedAt', { when: relativeDay(theatreDate(hero.previousClosedAt), now).toLocaleLowerCase('pl') })
            : t('closed')
        if (p.stage === 'preshow' && blockingCount > 0 && isToday) return t('blockingCount', { count: blockingCount })
        if (p.stage === 'intermission') return t('atIntermission')
        if (p.stage === 'postshow') return t('returnToStorage')
        return null
    }

    return (
        <section className="pl-hero !gap-6 max-md:!p-4 md:flex-[2_1_560px]" aria-labelledby="db-next">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="db-next" className="pl-count m-0">
                        {eyebrow}{hero.venue && <span className="hidden md:inline">{` · ${hero.venue}`}</span>}
                    </h2>
                    <span className="rk-badge rk-badge--info">{when}</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="md:hidden"><ShowTitle title={hero.title} phone /></div>
                    <div className="hidden md:block"><ShowTitle title={hero.title} /></div>
                    <div className="pl-countdown hidden md:flex">
                        <b>{startsIn > 0 && days === 0 ? duration(startsIn) : t('inDays', { count: days })}</b>
                        <small>{days === 0 ? t('toStart') : `${weekdayShort(d).toLocaleLowerCase('pl')} ${dayMonth(d)}, ${time(d)}`}</small>
                    </div>
                </div>
                <span className="rk-tally md:hidden">
                    {[hero.venue, startsIn > 0 && days === 0 && t('startsIn', { time: duration(startsIn) })].filter(Boolean).join(' · ')}
                </span>
            </div>

            <div className="pl-tix">
                <div className="pl-tix__bar" style={{ gridTemplateColumns: `repeat(${hero.progress.length}, minmax(0, 1fr))` }} role="img"
                    aria-label={t('progressAria', { stages: hero.progress.map(p => `${t(`stage.${p.stage}`)} ${p.done}/${p.total}`).join(', ') })}>
                    {hero.progress.map(p => (
                        <span key={p.stage} className={`pl-tix__seg ${p.complete ? 'is-done' : ''}`}>
                            <span style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` }} />
                        </span>
                    ))}
                </div>
                <div className="pl-tix__labels" style={{ gridTemplateColumns: `repeat(${hero.progress.length}, minmax(0, 1fr))` }}>
                    {hero.progress.map((p, i) => {
                        const current = isToday && !p.complete && hero.progress.findIndex(x => !x.complete) === i
                        const meta = stageMeta(p)
                        return (
                            <Link key={p.stage} href={`/lists/${hero.listId}`} className={`pl-tix__lab ${p.complete ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
                                <b className="max-md:!text-[13px] max-md:!leading-[18px]">{t(`stage.${p.stage}`)}{p.complete && <Check />}</b>
                                <small>
                                    {!p.complete && <span className="pl-stage__n">{p.done}/{p.total}</span>}
                                    {meta && <span className={p.complete ? '' : 'hidden md:inline'}>{!p.complete && ' · '}{meta}</span>}
                                </small>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {blockingCount > 0 ? (
                <BlockingList
                    items={hero.blocking.flatMap(p => (p.group && p.group.status !== 'available'
                        ? [{ id: p.id, name: p.name, status: p.group.status, statusNote: p.group.statusNote, from: p.from, code: p.code }]
                        : []))}
                />
            ) : (
                <p className="text-ink-muted" style={{ font: '400 16px/24px var(--font-sans)' }}>{t('nothingBlocking')}</p>
            )}

            {/* Przyciski zawsze po prawej; zespół w kulisach (gdy ktoś jest) po lewej. Bez kreski i dodatkowego odstępu. */}
            <div className="flex flex-wrap items-center justify-end gap-4">
                {hero.crew.length > 0 && (
                    <div className="mr-auto hidden items-center gap-3 md:flex">
                        <span className="pl-team">{hero.crew.slice(0, 4).map(c => <RkAvatar key={c.id} name={avatarFor(c.id)} size={32} />)}</span>
                        <span className="pl-team-label">{isToday ? t('crewToday', { names: crewNames }) : t('crewOn', { day: relativeDay(d, now).toLocaleLowerCase('pl'), names: crewNames })}</span>
                    </div>
                )}
                <div className="flex w-full flex-wrap justify-end gap-3 md:w-auto">
                    <Link className="rk-btn rk-btn--ghost hidden md:inline-flex" href={`/performances/${hero.performanceId}`}>{t('details')}</Link>
                    <Link
                        className={`rk-btn ${isToday ? 'rk-btn--primary' : 'rk-btn--secondary'} max-md:w-full max-md:!h-12 max-md:!text-base`}
                        href={`/lists/${hero.listId}`}
                    >
                        {isToday ? t('openList') : t('openListFor', { day: relativeDay(d, now).toLocaleLowerCase('pl') })}
                    </Link>
                </div>
            </div>
        </section>
    )
}

// Pierwsze uruchomienie (ekran „Pierwsze-uruchomienie”, sekcja „Stany”): pusty magazyn w karcie,
// obok pierwsze kroki i zaproszenie zespołu. Na telefonie bez karty, prosto w treści.
function FirstRunHero({ t, canEdit }: { t: T; canEdit: boolean }) {
    return (
        <section className="pl-hero max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:flex-[2_1_560px]">
            <EmptyState art="closed" title={t('firstTitle')} actions={canEdit && <>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <Link className="rk-btn rk-btn--primary max-md:!h-12 max-md:w-full" href="/scan"><Camera />{t('firstPhoto')}</Link>
                    <Link className="rk-btn rk-btn--secondary max-md:w-full" href="/groups?import=1"><FileText />{t('firstImport')}</Link>
                </div>
                <Link className="rk-btn rk-btn--ghost" href="/groups?create=1">{t('firstManual')}</Link>
            </>}>
                {t('firstText')}
            </EmptyState>
        </section>
    )
}

function FirstRunAside({ t }: { t: T }) {
    const steps = [
        { title: t('step1'), text: t('step1Text'), href: '/scan' },
        { title: t('step2'), text: t('step2Text'), href: '/performances/new' },
        { title: t('step3'), text: t('step3Text'), href: '/settings' },
    ]
    return (
        <div className="flex flex-col gap-12 md:flex-[1_1_280px]">
            <section className="pl-sect" aria-labelledby="db-first">
                <div className="pl-sect-head pl-sect-head--rule">
                    <h2 className="pl-h2" id="db-first">{t('firstSteps')}</h2>
                    <span className="rk-fraction">0/{steps.length}</span>
                </div>
                <ol className="st-steps">
                    {steps.map(s => (
                        <li key={s.title}>
                            <Link className="pl-main" href={s.href}><b>{s.title}</b><small>{s.text}</small></Link>
                        </li>
                    ))}
                </ol>
            </section>
            <section className="pl-sect" aria-labelledby="db-team">
                <div className="pl-sect-head pl-sect-head--rule">
                    <h2 className="pl-h2" id="db-team">{t('team')}</h2>
                    <span className="rk-tally">{t('onlyYou')}</span>
                </div>
                <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('teamText')}</p>
                <Link className="rk-btn rk-btn--secondary self-start" href="/settings"><Mail />{t('invite')}</Link>
            </section>
        </div>
    )
}

function Storage({ storage, t, grid = false }: { storage: DashboardData['storage']; t: T; grid?: boolean }) {
    return (
        <section className="pl-sect" aria-labelledby={grid ? 'db-mag-m' : 'db-mag'}>
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id={grid ? 'db-mag-m' : 'db-mag'}>{t('storage')}</h2>
                <Link className="pl-link" href="/groups">{grid ? t('storageLinkShort') : t('storageLink')}<ChevronRight /></Link>
            </div>
            <div className={`pl-figs ${grid ? 'pl-figs--grid' : ''}`}>
                <div className="pl-fig">
                    <span className="pl-fig__label">{t('inStorage')}</span>
                    <span className="pl-fig__value">{storage.total}</span>
                    <span className="pl-fig__note">{t('inLocations', { count: storage.locations })}</span>
                </div>
                <div className="pl-fig">
                    <span className="pl-fig__label">{t('inRepair')}</span>
                    <span className="pl-fig__value">{storage.inRepair}</span>
                    {storage.neededToday > 0 && <span className="pl-fig__note"><span className="rk-badge rk-badge--warning">{t('neededToday', { count: storage.neededToday })}</span></span>}
                </div>
                <div className="pl-fig">
                    <span className="pl-fig__label">{t('loaned')}</span>
                    <span className="pl-fig__value">{storage.loaned}</span>
                </div>
                <div className="pl-fig">
                    <span className="pl-fig__label">{t('missing')}</span>
                    <span className={`pl-fig__value ${storage.missing.count > 0 ? 'pl-fig__value--alert' : ''}`}>{storage.missing.count}</span>
                    {storage.missing.names.length > 0 && (
                        <span className="pl-fig__note"><span className="rk-badge rk-badge--danger">{storage.missing.names[0]}{storage.missing.names.length > 1 ? ` +${storage.missing.names.length - 1}` : ''}</span></span>
                    )}
                </div>
            </div>
        </section>
    )
}
