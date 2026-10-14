'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBanner } from '@/components/rk/StatusBanner'
import { useTranslations } from 'next-intl'
import { Check, ChevronRight, Eye, MapPin, TriangleAlert, User } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { MobileTop } from '@/components/rk/MobileTop'
import { ShowTitle } from '@/components/rk/ShowTitle'
import { Button } from '@/components/ui/Button'
import { RkAvatar, avatarFor } from '@/components/rk/RkAvatar'
import { playOrder, skippedForCast, type PerformanceStructure, type StructuredScene } from '@/lib/performance-structure'
import { castLabel, plural, roman, theatreDate, theatreNaiveToInstant, time } from '@/lib/rk-format'
import { useListChecks } from './useListChecks'
import { SyncBanner } from './SyncBanner'

export type LiveCheck = { propId: string; at: string; by: { id: string; name: string } | null }
export type LiveReport = {
    id: string
    message: string
    scene_number: number | null
    created_at: string
    performance_prop_id: string | null
    profile: { id: string; full_name: string | null } | null
}

type Props = {
    list: { id: string; showDate: string; cast: string | null; sceneNumber: number | null; actStartedAt: string | null }
    performance: { id: string; title: string; venue: string | null }
    structure: PerformanceStructure
    initialChecks: LiveCheck[]
    initialReports: LiveReport[]
    crew: { id: string; name: string; role: string | null }[]
    userId: string | null
    /** Zapis w bieżącym teatrze (lib/access). Podgląd i demo: odhaczenia tylko na ekranie, bez przełączania scen i zgłoszeń. */
    canWrite: boolean
    now: string
}

// Tryb na żywo (karta NaZywo, ekrany „Na-zywo-telefon” i „Na-zywo”): telefon rekwizytora
// podąża za sceną przełączaną przez inspicjenta na komputerze („Następna scena” albo spacja).
export function LiveView({ list, performance, structure, initialChecks, initialReports, crew, userId, canWrite, now }: Props) {
    const t = useTranslations('Live')
    const scenes = playOrder(structure)
    const [sceneNumber, setSceneNumber] = useState<number | null>(list.sceneNumber ?? scenes[0]?.number ?? null)
    const [actStartedAt, setActStartedAt] = useState(list.actStartedAt ?? null)
    // Stan potwierdzeń (z kolejką bez sieci) w useListChecks; tu tylko kto i kiedy, do pokazania na komputerze.
    const { isChecked, toggle: toggleCheck, sync, retry } = useListChecks(list.id, initialChecks.map(c => ({ performance_prop_id: c.propId, stage: 'live' })), { localOnly: !canWrite })
    const [meta, setMeta] = useState(() => new Map(initialChecks.map(c => [c.propId, c])))
    const [reports, setReports] = useState(initialReports)
    const [reporting, setReporting] = useState(false)
    const [clock, setClock] = useState('0:00')

    const index = Math.max(0, scenes.findIndex(s => s.number === sceneNumber))
    const scene: StructuredScene | undefined = scenes[index]
    const nextScene = scenes[index + 1]
    const act = scene?.act ?? 1
    const actScenes = structure.acts.find(a => a.act === act)?.scenes ?? []
    const props = (scene?.props ?? []).filter(p => !skippedForCast(p, list.cast))
    const doneCount = props.filter(p => isChecked(p.id, 'live')).length

    // Zegar od początku aktu (gdy inspicjent jeszcze nie przełączał, od godziny spektaklu).
    useEffect(() => {
        const start = actStartedAt ? new Date(actStartedAt).getTime() : theatreNaiveToInstant(list.showDate)
        const tick = () => {
            const s = Math.max(0, Math.floor((Date.now() - start) / 1000))
            setClock(`${Math.floor(s / 3600) > 0 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}` : Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [actStartedAt, list.showDate])

    // Realtime: scena, potwierdzenia i zgłoszenia z innych urządzeń.
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel(`live:${list.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'show_lists', filter: `id=eq.${list.id}` }, payload => {
                const row = payload.new as { live_scene_number: number | null; live_act_started_at: string | null }
                setSceneNumber(row.live_scene_number)
                setActStartedAt(row.live_act_started_at)
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'show_list_reports', filter: `show_list_id=eq.${list.id}` }, payload => {
                const row = payload.new as LiveReport
                setReports(prev => prev.some(r => r.id === row.id) ? prev : [{ ...row, profile: null }, ...prev])
            })
            .subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [list.id])

    const toggle = (propId: string) => {
        if (!isChecked(propId, 'live')) setMeta(prev => new Map(prev).set(propId, { propId, at: new Date().toISOString(), by: null }))
        void toggleCheck(propId, 'live')
    }

    const goNext = useCallback(async () => {
        if (!canWrite || !nextScene) return
        const actChanged = nextScene.act !== act
        const startedAt = actChanged ? new Date().toISOString() : actStartedAt
        setSceneNumber(nextScene.number)
        setActStartedAt(startedAt)
        const { error } = await createClient().from('show_lists')
            .update({ live_scene_number: nextScene.number, live_act_started_at: startedAt, live_updated_by: userId })
            .eq('id', list.id)
        if (error) notify.error(t('switchFailed'))
    }, [canWrite, nextScene, act, actStartedAt, userId, list.id, t])

    // „Następna scena” spacją (komputer inspicjenta), poza polami formularza.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement
            if (e.code !== 'Space' || reporting || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)) return
            if (window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); void goNext() }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [goNext, reporting])

    const strip = (wide: boolean) => (
        <div className={`rk-live-strip ${wide ? 'rk-live-strip--wide' : ''}`} role="status">
            <span className="rk-live-dot" />
            <b>{t('live')}</b>
            <span>{`${performance.title} · ${t('act', { act: roman(act) })}`}</span>
            <span className="rk-live-clock" aria-label={t('clockAria')}>{clock}</span>
        </div>
    )

    const nowTheatre = new Date(now)
    const sceneProps = (s: StructuredScene) => s.props.filter(p => !skippedForCast(p, list.cast))

    return (
        <>
            {/* Telefon rekwizytora */}
            <div className="flex min-h-dvh flex-col md:hidden">
                <div style={{ paddingTop: 'env(safe-area-inset-top)' }} className="sticky top-0 z-20 bg-warning-tint">
                    {strip(false)}
                    <SyncBanner sync={sync} onRetry={retry} />
                    {!canWrite && <StatusBanner tone="readonly" icon={<Eye />}>{t('previewOnly')}</StatusBanner>}
                </div>
                <MobileTop back={{ href: `/lists/${list.id}?view=list`, label: t('backToList') }} />
                <div className="flex flex-1 flex-col gap-6 px-4 pt-2 pb-6">
                    <div className="flex flex-col gap-1">
                        <span className="rk-tally">{t('nowFollowing')}</span>
                        {scene && <h1 className="rk-live-scene"><span>{scene.code}</span>{scene.name}</h1>}
                    </div>

                    <section className="pl-sect" aria-labelledby="lv-give">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2" id="lv-give">{t('toGive')}</h2>
                            <span className={`rk-fraction ${doneCount < props.length ? 'is-current' : 'is-done'}`}>{doneCount}/{props.length}</span>
                        </div>
                        {props.length > 0 ? (
                            <ul className="pl-list pl-list--media" style={{ ['--pl-inset' as string]: '44px' }}>
                                {props.map(p => (
                                    <li key={p.id}>
                                        <label className="rk-check ls-item rk-live-item">
                                            <input type="checkbox" checked={isChecked(p.id, 'live')} onChange={() => toggle(p.id)} />
                                            <span className="rk-box"><Check className="i-chk" /></span>
                                            <span className="rk-entry">
                                                <span className="rk-entry__name">{p.name}</span>
                                                {p.handler && <span className="rk-entry__how"><User /><span>{p.handler}</span></span>}
                                                {p.where && <span className="rk-entry__where"><MapPin /><span>{p.where}</span></span>}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="pl-meta">{t('nothingInScene')}</p>}
                    </section>

                    {nextScene && (
                        <div className="rk-live-next">
                            <span className="rk-tally">{t('next')}</span>
                            <b>{`${nextScene.code} · ${nextScene.name}`}</b>
                            <small>{[plural(sceneProps(nextScene).length, ['rekwizyt', 'rekwizyty', 'rekwizytów']), sceneProps(nextScene)[0]?.area].filter(Boolean).join(' · ')}</small>
                        </div>
                    )}
                </div>
                {canWrite && (
                    <div className="rk-live-bottom sticky bottom-0" style={{ paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))' }}>
                        <Button variant="danger" size="lg" className="w-full" leftIcon={<TriangleAlert />} onClick={() => setReporting(true)}>
                            {t('report')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Komputer inspicjenta */}
            <div className="mx-auto hidden max-w-[1184px] flex-col gap-8 px-12 pt-8 pb-12 md:flex">
                {strip(true)}
                <SyncBanner sync={sync} onRetry={retry} />
                {!canWrite && <StatusBanner tone="readonly" icon={<Eye />}>{t('previewOnly')}</StatusBanner>}
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className="rk-tally">
                            {[t('eyebrow'), t('liveLower'), list.cast && t('cast', { cast: castLabel(list.cast) ?? '' })].filter(Boolean).join(' · ')}
                        </span>
                        <ShowTitle title={performance.title} />
                    </div>
                    {canWrite && nextScene && (
                        <div className="flex items-center gap-4">
                            <span className="pl-meta">{t('orSpace')}</span>
                            <Button size="lg" rightIcon={<ChevronRight />} onClick={goNext}>{t('nextScene', { code: nextScene.code })}</Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-[280px_minmax(0,1fr)_272px] items-start gap-12">
                    <section className="pl-sect" aria-labelledby="lv-act">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2" id="lv-act">{t('actTitle', { act: roman(act) })}</h2>
                            <span className="rk-tally">{t('sceneOf', { n: actScenes.findIndex(s => s.number === sceneNumber) + 1, total: actScenes.length })}</span>
                        </div>
                        <ol className="rk-live-tl">
                            {structure.preparation.map(s => (
                                <li key={s.id} className="rk-live-tl__i is-done"><span className="rk-live-tl__n">{s.code}</span><span className="rk-live-tl__t">{s.name}</span></li>
                            ))}
                            {actScenes.map(s => {
                                const state = s.number === sceneNumber ? 'is-now' : scenes.indexOf(s) < index ? 'is-done' : ''
                                return (
                                    <li key={s.id} className={`rk-live-tl__i ${state}`} aria-current={state === 'is-now' ? 'step' : undefined}>
                                        <span className="rk-live-tl__n">{s.code}</span>
                                        <span className="rk-live-tl__t">{s.name}</span>
                                        {state === 'is-now' && <span className="rk-count rk-count--live">{t('now')}</span>}
                                    </li>
                                )
                            })}
                        </ol>
                    </section>

                    <section className="pl-sect" aria-labelledby="lv-scene">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2" id="lv-scene">{scene ? `${scene.code} · ${scene.name}` : '—'}</h2>
                            <span className={`rk-fraction ${doneCount < props.length ? 'is-current' : 'is-done'}`}>{t('readyCount', { done: doneCount, total: props.length })}</span>
                        </div>
                        {props.length > 0 ? (
                            <ul className="pl-list pl-list--media" style={{ ['--pl-inset' as string]: '36px' }}>
                                {props.map(p => {
                                    const c = isChecked(p.id, 'live') ? meta.get(p.id) ?? { propId: p.id, at: new Date().toISOString(), by: null } : null
                                    return (
                                        <li key={p.id}>
                                            <button type="button" className="contents" onClick={() => toggle(p.id)} aria-pressed={!!c} aria-label={p.name}>
                                                {c ? <span className="rk-live-ok"><Check /></span> : <span className="rk-live-wait" />}
                                            </button>
                                            <span className="rk-entry rk-entry--sm">
                                                <span className="rk-entry__name">{p.name}</span>
                                                {p.where && <span className="rk-entry__where"><MapPin /><span>{p.where}</span></span>}
                                            </span>
                                            <span className="pl-time">
                                                {c ? [c.by?.name?.split(' ')[0], time(theatreDate(c.at))].filter(Boolean).join(' · ') : p.handler}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : <p className="pl-meta">{t('nothingInScene')}</p>}
                    </section>

                    <div className="flex flex-col gap-12">
                        <section className="pl-sect" aria-labelledby="lv-reports">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <h2 className="pl-h2" id="lv-reports">{t('reports')}</h2>
                                {reports.length > 0 && <span className="rk-count rk-count--live">{reports.length}</span>}
                            </div>
                            {reports.length > 0 ? reports.map(r => {
                                const prop = structure.props.find(p => p.id === r.performance_prop_id)
                                return (
                                    <div key={r.id} className="rk-alert rk-alert--warning">
                                        <TriangleAlert />
                                        <div>
                                            {prop && <strong>{t('reportTitle', { name: prop.name, code: prop.code })}</strong>}
                                            {[r.profile?.full_name?.split(' ')[0], r.message].filter(Boolean).join(': ')}
                                            {` · ${time(theatreDate(r.created_at))}`}
                                        </div>
                                    </div>
                                )
                            }) : <p className="pl-meta">{t('noReports')}</p>}
                        </section>

                        <section className="pl-sect" aria-labelledby="lv-crew">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <h2 className="pl-h2" id="lv-crew">{t('crew')}</h2>
                                <span className="rk-tally">{plural(crew.length, ['osoba', 'osoby', 'osób'])}</span>
                            </div>
                            {crew.length > 0 ? (
                                <ul className="pl-list pl-list--media">
                                    {crew.map(c => (
                                        <li key={c.id}>
                                            <RkAvatar name={avatarFor(c.id)} size={32} />
                                            <span className="pl-main"><b>{c.name}</b></span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="pl-meta">{t('crewEmpty')}</p>}
                        </section>

                        <Link className="pl-link" href={`/lists/${list.id}?view=list`}>{t('fullList')}<ChevronRight /></Link>
                    </div>
                </div>
            </div>

            {reporting && (
                <ReportDialog
                    listId={list.id}
                    scene={scene}
                    props={props}
                    userId={userId}
                    onClose={() => setReporting(false)}
                    onSent={r => setReports(prev => [r, ...prev])}
                    nowLabel={time(nowTheatre)}
                />
            )}
        </>
    )
}

// „Zgłoś problem” (karta Modal): krótko, co się stało; opcjonalnie którego rekwizytu dotyczy.
function ReportDialog({ listId, scene, props, userId, onClose, onSent }: {
    listId: string
    scene: StructuredScene | undefined
    props: StructuredScene['props']
    userId: string | null
    onClose: () => void
    onSent: (r: LiveReport) => void
    nowLabel: string
}) {
    const t = useTranslations('Live')
    const [message, setMessage] = useState('')
    const [propId, setPropId] = useState('')
    const [sending, setSending] = useState(false)
    const ref = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        ref.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const send = async () => {
        if (!message.trim()) { ref.current?.focus(); return }
        setSending(true)
        const { data, error } = await createClient().from('show_list_reports')
            .insert({ show_list_id: listId, message: message.trim(), performance_prop_id: propId || null, scene_number: scene?.number ?? null, created_by: userId })
            .select('id, message, scene_number, created_at, performance_prop_id')
            .single()
        setSending(false)
        if (error || !data) { notify.error(t('reportFailed')); return }
        onSent({ ...data, profile: null })
        notify.success(t('reportSent'))
        onClose()
    }

    return (
        <div className="rk-overlay fixed inset-0 z-[60] rounded-none">
            <div className="rk-modal" role="dialog" aria-modal="true" aria-labelledby="lv-report-title">
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id="lv-report-title">{t('report')}</h3>
                        {scene && <p className="rk-modal__desc">{`${scene.code} · ${scene.name}`}</p>}
                    </div>
                </div>
                <div className="rk-modal__body rk-stack">
                    {props.length > 0 && (
                        <label className="rk-field">
                            <span className="rk-label">{t('reportProp')}</span>
                            <span className="rk-select">
                                <select value={propId} onChange={e => setPropId(e.target.value)}>
                                    <option value="">{t('reportNoProp')}</option>
                                    {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </span>
                        </label>
                    )}
                    <label className="rk-field">
                        <span className="rk-label">{t('reportMessage')}</span>
                        <textarea ref={ref} className="rk-textarea" value={message} onChange={e => setMessage(e.target.value)} placeholder={t('reportPlaceholder')} />
                    </label>
                </div>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                    <Button variant="danger" onClick={send} isLoading={sending} loadingLabel={t('sending')}>{t('send')}</Button>
                </div>
            </div>
        </div>
    )
}
