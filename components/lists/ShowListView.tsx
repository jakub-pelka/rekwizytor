'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, Eye, Minus, Users } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { MobileTop } from '@/components/rk/MobileTop'
import { ShowTitle } from '@/components/rk/ShowTitle'
import { PropEntry } from '@/components/rk/PropEntry'
import { GROUP_STATUS, GroupStatusBadge, GroupStatusIcon } from '@/components/rk/GroupStatus'
import { RkAvatar, avatarFor } from '@/components/rk/RkAvatar'
import { EmptyState } from '@/components/rk/EmptyState'
import { StatusBanner } from '@/components/rk/StatusBanner'
import { Button } from '@/components/ui/Button'
import {
    EARLY_START_MS, canResumeLive, isBlocking, isLiveNow, propInStage, skippedForCast, stagesFor,
    type PerformanceStructure, type Stage, type StructuredProp,
} from '@/lib/performance-structure'
import { castLabel, dayMonth, duration, isSameDay, plural, relativeDay, time, weekdayShort } from '@/lib/rk-format'
import { useListChecks, type ListCheck } from './useListChecks'
import { useListPrefs, type ListDetail } from '@/lib/use-list-prefs'
import { SyncBanner } from './SyncBanner'
import { LiveStartButton } from './LiveStartButton'
import { useLiveStart } from './useLiveStart'
import { useLiveResume } from './useLiveEnd'

export type { ListCheck }

type ListInfo = { id: string; showDate: string; kind: string; cast: string | null; startedAt?: string | null; endedAt?: string | null }
type Filter = 'todo' | 'done' | 'all'
type Grouping = 'area' | 'scene'
type Detail = ListDetail
export type CrewMember = { id: string; name: string; role: string | null; count: number }

type Props = {
    list: ListInfo
    performance: { id: string; title: string; venue: string | null }
    structure: PerformanceStructure
    initialChecks: ListCheck[]
    crew: CrewMember[]
    next: { list: ListInfo; title: string; structure: PerformanceStructure; checks: ListCheck[] } | null
    canEdit: boolean
    now: string
}

// Lista zadań na termin („Lista”, „Lista-telefon”): etapy w motywie biletu, „Blokuje gotowość”,
// rekwizyty pogrupowane po miejscu albo scenie, odhaczanie i przygotowanie na następny spektakl.
export function ShowListView({ list, performance, structure, initialChecks, crew, next, canEdit, now }: Props) {
    const t = useTranslations('ShowList')
    const tn = useTranslations('Navigation')
    const nowDate = new Date(now)
    const showDate = new Date(list.showDate)
    const { isChecked, toggle, sync, retry } = useListChecks(list.id, initialChecks, { localOnly: !canEdit })
    const router = useRouter()
    const liveStart = useLiveStart(list.id, () => router.push(`/lists/${list.id}/live`), () => router.push(`/lists/${list.id}`))
    const liveResume = useLiveResume(list.id, list.endedAt, () => router.push(`/lists/${list.id}/live`), () => router.push(`/lists/${list.id}`))

    const stages = stagesFor(list.kind, structure.actCount)
    const stageProps = (stage: Stage) => structure.props.filter(p => propInStage(p, stage))
    const counted = (stage: Stage) => stageProps(stage).filter(p => !skippedForCast(p, list.cast))
    const progress = stages.map(stage => {
        const props = counted(stage)
        const done = props.filter(p => isChecked(p.id, stage)).length
        return { stage, done, total: props.length, complete: props.length > 0 && done === props.length }
    })

    // Domyślnie pierwszy niezamknięty etap.
    const firstOpen = progress.find(p => !p.complete)?.stage ?? stages[stages.length - 1]
    const [stage, setStage] = useState<Stage>(firstOpen)
    const [filter, setFilter] = useState<Filter>('todo')
    const [grouping, setGrouping] = useState<Grouping>('area')
    // Szczegóły wpisu i zwijanie odhaczonych to ustawienia osoby (konto, POMYSLY 6); przełącznik też jest tutaj.
    const { prefs, update: updatePrefs } = useListPrefs()
    const detail = prefs.detail
    const chooseDetail = (d: Detail) => { void updatePrefs({ detail: d }) }
    const [showDone, setShowDone] = useState(false)

    const current = stageProps(stage)
    const skipped = current.filter(p => skippedForCast(p, list.cast))
    const active = current.filter(p => !skippedForCast(p, list.cast))
    const blocking = active.filter(isBlocking)
    const regular = active.filter(p => !isBlocking(p))
    const doneCount = active.filter(p => isChecked(p.id, stage)).length
    const todoCount = active.length - doneCount

    // Grupy listy: miejsca w kolejności z rozpiski (bez miejsca na końcu) albo sceny w kolejności spektaklu.
    const sceneNames = new Map(
        [...structure.preparation, ...structure.acts.flatMap(a => a.scenes)].map(s => [s.code, s.name])
    )
    const groupKey = (p: StructuredProp) => (grouping === 'area' ? p.area ?? '' : p.code)
    const grouped = new Map<string, StructuredProp[]>()
    for (const p of [...regular, ...skipped]) {
        const k = groupKey(p)
        if (!grouped.has(k)) grouped.set(k, [])
        grouped.get(k)!.push(p)
    }
    const order = grouping === 'scene' ? structure.props.map(p => p.code) : []
    const groups = [...grouped.entries()].sort(([a], [b]) => {
        if (grouping === 'scene') return order.indexOf(a) - order.indexOf(b)
        return a === '' ? 1 : b === '' ? -1 : 0
    })
    const groupTitle = (k: string) => {
        if (grouping === 'area') return k || t('noArea')
        const name = sceneNames.get(k)
        return name ? `${k} · ${name}` : k || t('noScene')
    }

    const castProps = structure.props.filter(p => p.castOnly != null)
    const skippedToday = list.cast ? castProps.filter(p => p.castOnly !== list.cast) : []
    const onlyToday = list.cast ? castProps.filter(p => p.castOnly === list.cast) : []

    const startsIn = showDate.getTime() - nowDate.getTime()
    const startsToday = startsIn > 0 && isSameDay(showDate, nowDate)
    const header = [
        t('eyebrow'),
        `${relativeDay(showDate, nowDate)} ${time(showDate)}`,
        list.kind === 'rehearsal' && t('rehearsal'),
        list.cast && t('cast', { cast: castLabel(list.cast) ?? '' }),
    ].filter(Boolean).join(' · ')
    // Cichy „Zaczynamy”: spektakl dziś, którego tryb na żywo jeszcze nie ruszył ręcznie (rusza później albo wcześniej niż w kalendarzu).
    const canResume = canEdit && canResumeLive(list.kind, list.showDate, now, list.endedAt, list.startedAt)
    const canStartNow = canEdit && !canResume && list.kind === 'show' && !list.startedAt && ((startsIn > 0 && startsIn <= EARLY_START_MS) || isLiveNow(list.kind, list.showDate, now, list.startedAt, list.endedAt))
    const subline = [startsToday && t('startsIn', { time: duration(startsIn) }), performance.venue].filter(Boolean).join(' · ')

    const visible = (p: StructuredProp) => {
        const done = isChecked(p.id, stage)
        if (filter === 'todo') return !done || showDone
        if (filter === 'done') return done
        return true
    }

    const checkRow = (p: StructuredProp, listId = list.id, checkedFn = isChecked, toggleFn = toggle, rowStage = stage) => (
        <li key={`${listId}:${p.id}`}>
            <label className="rk-check ls-item">
                <input
                    type="checkbox"
                    checked={checkedFn(p.id, rowStage)}
                    onChange={() => toggleFn(p.id, rowStage)}
                />
                <span className="rk-box"><Check className="i-chk" /></span>
                {/* Przy wyłączonym zwijaniu wpis stoi w opakowaniu, więc reguła „odhaczone zwija się do nazwy” go nie obejmuje. */}
                {(() => {
                    const entry = (
                        <PropEntry
                            name={p.name}
                            how={detail === 'all' ? p.how : null}
                            where={detail !== 'names' ? p.where : null}
                            from={detail === 'all' ? p.from : null}
                        />
                    )
                    return prefs.collapseDone ? entry : <span className="flex min-w-0 flex-1">{entry}</span>
                })()}
                <span className="ls-scene">{grouping === 'scene' ? p.area : p.code}</span>
            </label>
        </li>
    )

    const skipRow = (p: StructuredProp) => (
        <li key={`skip:${p.id}`}>
            <span className="ls-skip">
                <span className="ls-dash"><Minus /></span>
                <span className="rk-entry">
                    <span className="rk-entry__name">{p.name}</span>
                    <span className="rk-entry__how"><ClipboardList /><span>{t('skippedToday', { cast: castLabel(p.castOnly) ?? '' })}</span></span>
                </span>
                <span className="ls-scene">{p.code}</span>
            </span>
        </li>
    )

    const stageMeta = (s: Stage, complete: boolean) => {
        if (complete) return t('stageClosed')
        if (s === 'intermission') return t('stageMetaIntermission')
        if (s === 'postshow') return t('stageMetaPostshow')
        return null
    }

    return (
        <div>
            <div className="sticky top-0 z-20"><SyncBanner sync={sync} onRetry={retry} /></div>
            {/* Podgląd i demo: odhaczać można, ale tylko na tym ekranie. Mówimy to raz, spokojnie, bez błędów przy każdym kliknięciu. */}
            {!canEdit && (
                <div className="mx-auto max-w-[1136px] px-4 pt-4 md:px-12">
                    <StatusBanner tone="readonly" icon={<Eye />}>{t('previewOnly')}</StatusBanner>
                </div>
            )}
            <MobileTop back={{ href: '/calendar', label: t('back') }} title={performance.title} anchorId="list-title" />
            <div className="mx-auto max-w-[1136px] px-4 pt-2 pb-8 md:px-12 md:pt-8 md:pb-12">
                <Link href="/calendar" className="pl-back mb-4 hidden md:inline-flex">
                    <ChevronLeft />{t('back')}
                </Link>

                <div className="flex flex-col gap-4 md:gap-8">
                    <div className="flex items-end justify-between gap-6">
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="rk-tally">{header}</span>
                            <div className="md:hidden"><ShowTitle title={performance.title} phone id="list-title" /></div>
                            <div className="hidden md:block"><ShowTitle title={performance.title} /></div>
                            {subline && <span className="rk-tally md:hidden">{subline}</span>}
                            {canStartNow && (
                                <LiveStartButton className="mt-1" onStart={liveStart.start} starting={liveStart.starting} pending={!!liveStart.pending} />
                            )}
                            {canResume && (
                                <div className="mt-1 flex">
                                    <Button variant="ghost" size="sm" onClick={liveResume.resume} isLoading={liveResume.resuming} loadingLabel={t('resumeLive')} title={t('resumeLiveHint')}>
                                        {t('resumeLive')}
                                    </Button>
                                </div>
                            )}
                        </div>
                        {startsToday && (
                            <div className="pl-countdown hidden md:flex">
                                <b>{duration(startsIn)}</b>
                                <small>{t('toStart')}</small>
                            </div>
                        )}
                    </div>

                    <div className="pl-tix md:max-w-[880px]">
                        <div
                            className="pl-tix__bar"
                            style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
                            role="img"
                            aria-label={t('stagesAria', {
                                stages: progress.map(p => `${t(`stage.${p.stage}`)} ${p.done}/${p.total}`).join(', '),
                            })}
                        >
                            {progress.map(p => (
                                <span key={p.stage} className={`pl-tix__seg ${p.complete ? 'is-done' : ''}`}>
                                    <span style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` }} />
                                </span>
                            ))}
                        </div>
                        <div className="pl-tix__labels" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
                            {progress.map((p, i) => {
                                const meta = stageMeta(p.stage, p.complete)
                                return (
                                    <button
                                        key={p.stage}
                                        type="button"
                                        className={`pl-tix__lab text-left ${p.complete ? 'is-done' : ''} ${p.stage === stage ? 'is-current' : ''}`}
                                        aria-current={p.stage === stage ? 'step' : undefined}
                                        onClick={() => { setStage(p.stage); setShowDone(false) }}
                                        style={{ paddingRight: i === progress.length - 1 ? 0 : 8 }}
                                    >
                                        <b className="max-md:!text-[13px] max-md:!leading-[18px]">
                                            {t(`stage.${p.stage}`)}
                                            {p.complete && <Check />}
                                        </b>
                                        <small>
                                            {!p.complete && (
                                                <span className={`rk-fraction ${p.stage === stage ? 'is-current' : ''}`}>{p.done}/{p.total}</span>
                                            )}
                                            {meta && <span className="hidden md:inline">{!p.complete && ' · '}{meta}</span>}
                                        </small>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-6 md:mt-8 md:grid md:grid-cols-[minmax(0,1fr)_346px] md:gap-12">
                    <div className="flex min-w-0 flex-col gap-6 md:gap-8">
                        <div className="flex flex-col gap-4 md:gap-8">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="pl-chips" role="group" aria-label={t('show')}>
                                    {([
                                        ['todo', t('filterTodo'), todoCount],
                                        ['done', t('filterDone'), doneCount],
                                        ['all', t('filterAll'), active.length],
                                    ] as const).map(([id, label, n]) => (
                                        <button key={id} className="rk-chip max-md:!h-10" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                                            {label}
                                            {n > 0 && <span className="rk-chip__n">{n}</span>}
                                        </button>
                                    ))}
                                </div>
                                <div className="rk-tabs hidden md:inline-flex" role="tablist" aria-label={t('grouping')}>
                                    {(['area', 'scene'] as const).map(g => (
                                        <button key={g} className="rk-tab" role="tab" aria-selected={grouping === g} onClick={() => setGrouping(g)}>
                                            {g === 'area' ? t('byArea') : t('byScene')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rk-tabs self-start" role="tablist" aria-label={t('detail')}>
                                {(['all', 'where', 'names'] as const).map(d => (
                                    <button key={d} className="rk-tab" role="tab" aria-selected={detail === d} onClick={() => chooseDetail(d)}>
                                        {t(`detail_${d}`)}
                                    </button>
                                ))}
                            </div>

                            {list.cast && (skippedToday.length > 0 || onlyToday.length > 0) && (
                                <div className="rk-alert rk-alert--info">
                                    <Users />
                                    <div>
                                        <strong>{t('castToday', { cast: castLabel(list.cast) ?? '' })}</strong>
                                        {[
                                            skippedToday.length > 0 && t('castWithout', { names: skippedToday.map(p => p.name).join(', ') }),
                                            onlyToday.length > 0 && t('castWith', { names: onlyToday.map(p => p.name).join(', ') }),
                                        ].filter(Boolean).join(' ')}
                                    </div>
                                </div>
                            )}
                        </div>

                        {blocking.length > 0 && filter !== 'done' && (
                            <section className="pl-sect" aria-labelledby="ls-block">
                                <div className="pl-sect-head pl-sect-head--rule">
                                    <h2 className="pl-h2" id="ls-block">{t('blocking')}</h2>
                                    <span className="rk-tally">{plural(blocking.length, ['rekwizyt', 'rekwizyty', 'rekwizytów'])}</span>
                                </div>
                                <ul className="pl-list pl-list--media">
                                    {blocking.map(p => p.group && p.group.status !== 'available' && (
                                        <li key={p.id}>
                                            <GroupStatusIcon status={p.group.status} />
                                            <span className="ls-main">
                                                <b className="md:!text-sm md:!leading-5">{p.name}</b>
                                                <small>
                                                    <span className="md:hidden">{[GROUP_STATUS[p.group.status].label, p.group.statusNote].filter(Boolean).join(' · ')}</span>
                                                    <span className="hidden md:inline">{[p.from, p.group.statusNote, p.where].filter(Boolean).join(' · ')}</span>
                                                </small>
                                            </span>
                                            <span className="ls-scene">{p.code}</span>
                                            <span className="hidden md:inline-flex"><GroupStatusBadge status={p.group.status} /></span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {groups.map(([key, props]) => {
                            const rows = props.filter(p => skippedForCast(p, list.cast) ? filter !== 'done' : visible(p))
                            if (rows.length === 0) return null
                            const left = props.filter(p => !skippedForCast(p, list.cast) && !isChecked(p.id, stage)).length
                            const id = `ls-${grouping}-${key || 'none'}`
                            return (
                                <section key={id} className="pl-sect" aria-labelledby={id}>
                                    <div className="pl-sect-head pl-sect-head--rule">
                                        <h2 className="pl-h2" id={id}>{groupTitle(key)}</h2>
                                        <span className="rk-tally">{left > 0 ? t('leftCount', { count: left }) : t('areaDone')}</span>
                                    </div>
                                    <ul className="pl-list pl-list--media" style={{ ['--pl-inset' as string]: '36px' }}>
                                        {rows.map(p => (skippedForCast(p, list.cast) ? skipRow(p) : checkRow(p)))}
                                    </ul>
                                </section>
                            )
                        })}

                        {/* Kurtyna w górze: jedyny pusty stan, który jest dobrą wiadomością, więc bez akcji głównej. */}
                        {filter === 'todo' && todoCount === 0 && active.length > 0 && !showDone ? (
                            <EmptyState art="up" title={t('allDoneTitle')} actions={
                                <button type="button" className="pl-link" onClick={() => setShowDone(true)}>
                                    {t('showDone', { count: doneCount })}<ChevronRight />
                                </button>
                            }>
                                <span className="rk-fraction is-done">{`${doneCount}/${active.length}`}</span>
                                {` ${t('allDoneText')}`}
                                {stage === 'preshow' && startsToday && ` ${t('liveStartsAt', { time: time(showDate) })}`}
                            </EmptyState>
                        ) : filter === 'todo' && doneCount > 0 && (
                            <button type="button" className="pl-link self-start" onClick={() => setShowDone(s => !s)}>
                                {showDone ? t('hideDone') : t('showDone', { count: doneCount })}
                                {showDone ? <ChevronUp /> : <ChevronDown />}
                            </button>
                        )}

                        {active.length === 0 && skipped.length === 0 && (
                            <EmptyState art="closed" title={t('emptyStageTitle')}>{t('emptyStage')}</EmptyState>
                        )}

                        {stage === 'postshow' && next && <NextShowSection next={next} canEdit={canEdit} checkRow={checkRow} />}
                    </div>

                    <aside className="hidden md:block">
                        <section className="pl-sect" aria-labelledby="ls-crew">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <h2 className="pl-h2" id="ls-crew">{t('crew')}</h2>
                                <span className="rk-tally">{plural(crew.length, ['osoba', 'osoby', 'osób'])}</span>
                            </div>
                            {crew.length > 0 ? (
                                <ul className="pl-list pl-list--media">
                                    {crew.map(c => (
                                        <li key={c.id}>
                                            <RkAvatar name={avatarFor(c.id)} size={32} />
                                            <span className="pl-main">
                                                <b>{c.name}</b>
                                                <small>{[c.role && roleLabel(c.role, tn), t('checkedCount', { count: c.count })].filter(Boolean).join(' · ')}</small>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="pl-meta">{t('crewEmpty')}</p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    )
}

function roleLabel(role: string, t: (key: string) => string) {
    return ({ admin: t('roleAdmin'), manager: t('roleManager'), user: t('roleUser') } as Record<string, string>)[role] ?? role
}

// Po spektaklu: rzeczy na następny spektakl w kolejce, żeby część przygotować jeszcze dziś.
function NextShowSection({
    next, canEdit, checkRow,
}: {
    next: NonNullable<Props['next']>
    canEdit: boolean
    checkRow: (p: StructuredProp, listId: string, checked: (id: string, s: Stage | 'live') => boolean, toggle: (id: string, s: Stage | 'live') => Promise<void>, stage: Stage) => React.ReactNode
}) {
    const t = useTranslations('ShowList')
    const { isChecked, toggle } = useListChecks(next.list.id, next.checks, { localOnly: !canEdit })
    const d = new Date(next.list.showDate)
    const props = next.structure.props.filter(p => propInStage(p, 'preshow') && !skippedForCast(p, next.list.cast))
    const left = props.filter(p => !isChecked(p.id, 'preshow')).length
    if (!canEdit && left === 0) return null

    return (
        <section className="pl-sect" aria-labelledby="ls-next">
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id="ls-next">{t('nextShow', { title: next.title })}</h2>
                <span className="rk-tally">{`${weekdayShort(d)} ${dayMonth(d)} · ${time(d)}`}</span>
            </div>
            <p className="pl-meta">{t('nextShowLead', { count: left })}</p>
            <ul className="pl-list pl-list--media" style={{ ['--pl-inset' as string]: '36px' }}>
                {props.filter(p => !isChecked(p.id, 'preshow')).map(p => checkRow(p, next.list.id, isChecked, toggle, 'preshow'))}
            </ul>
        </section>
    )
}
