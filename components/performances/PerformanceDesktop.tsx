'use client'

import { SharedElement } from '@/components/rk/SharedElement'
import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronLeft, ChevronRight, FileDown, Pencil, Plus, Printer, Trash2, Users } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { restorePerformance, trashPerformance } from '@/app/actions/performance-trash'
import { ShowTitle } from '@/components/rk/ShowTitle'
import { PropEntry } from '@/components/rk/PropEntry'
import { GroupStatusBadge } from '@/components/rk/GroupStatus'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { EmptyState } from '@/components/rk/EmptyState'
import { notify } from '@/utils/notify'
import { exportPerformancePdf } from './ExportPerformanceButton'
import { PropEditDialog, type GroupOption } from './PropEditDialog'
import type { PerformanceStructure, StructuredProp, StructuredScene } from '@/lib/performance-structure'
import { castLabel, dayMonth, plural, relativeDay, roman, time, weekdayShort } from '@/lib/rk-format'

export type DesktopTerm = {
    id: string
    showDate: string
    kind: string
    cast: string | null
    progress: { done: number; total: number } | null
}

type Props = {
    performance: { id: string; title: string; venue: string | null; premiereDate: string | null; poster: string | null }
    structure: PerformanceStructure
    /** Najbliższy termin (dziś albo następny): od niego zależy główny przycisk. */
    nextTerm: DesktopTerm | null
    /** Kolejne terminy po najbliższym, najwyżej dwa. */
    laterTerms: DesktopTerm[]
    related: {
        castExceptions: number
        groups: number
        /** Najpoważniejszy stan grup spektaklu, gdy któraś nie jest na miejscu. */
        groupAlert: { label: string } | null
        notes: number
        newMentions: number
    }
    canEdit: boolean
    groups: GroupOption[]
    /** Grupy magazynu użyte w spektaklu (przez rekwizyty albo przypisane wprost): do druku etykiet. */
    labelGroupIds: string[]
    now: string
    exportData: Parameters<typeof exportPerformancePdf>[0]
}

type Editing = { prop: StructuredProp | null; defaults?: { scene: number | null; act: number | null } }

/** Ile scen aktu pokazujemy, zanim pojawi się „Pokaż sceny I.7–I.8”. */
const VISIBLE_SCENES = 6

const ROW_ARROW = <ChevronRight />

// Ekran spektaklu na komputerze (README, aktualizacja 8.10 (2); ekran „Spektakl”): nagłówek z plakatem,
// rozpiska w lewej kolumnie, cicha kolumna boczna z terminami i powiązanymi ekranami.
export function PerformanceDesktop({ performance, structure, nextTerm, laterTerms, related, canEdit, groups, labelGroupIds, now, exportData }: Props) {
    const t = useTranslations('PerformanceDesktop')
    const [view, setView] = useState<'scenes' | 'all'>('scenes')
    const [openScene, setOpenScene] = useState<string | null>(null)
    const [expandedActs, setExpandedActs] = useState<number[]>([])
    const [editing, setEditing] = useState<Editing | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const nowDate = new Date(now)

    const premiere = performance.premiereDate
        ? performance.premiereDate.split('-').reverse().join('.')
        : null
    const meta = [
        performance.venue,
        structure.actCount > 0 && plural(structure.actCount, ['akt', 'akty', 'aktów']),
        structure.sceneCount > 0 && plural(structure.sceneCount, ['scena', 'sceny', 'scen']),
        plural(structure.props.length, ['rekwizyt', 'rekwizyty', 'rekwizytów']),
        premiere && t('premiere', { date: premiere }),
    ].filter(Boolean).join(' · ')

    const termWhen = (term: DesktopTerm) => {
        const d = new Date(term.showDate)
        return `${relativeDay(d, nowDate)} ${time(d)}`
    }
    const termDetail = (term: DesktopTerm) =>
        [term.kind === 'rehearsal' && t('rehearsal'), term.cast && t('cast', { cast: castLabel(term.cast) ?? '' })].filter(Boolean).join(' · ')

    // Etykiety drukujemy dla grup z magazynu, z których korzysta spektakl (rekwizyt w rozpisce nie ma własnego kodu QR).
    const openLabels = () => {
        if (labelGroupIds.length === 0) { notify.error(t('labelsNone')); return }
        window.open(`/labels?kind=group&ids=${labelGroupIds.join(',')}`, '_blank')
    }

    const editProps = (p: StructuredProp) => canEdit ? {
        role: 'button' as const,
        tabIndex: 0,
        className: 'cursor-pointer',
        onClick: () => setEditing({ prop: p }),
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') setEditing({ prop: p }) },
        'aria-label': t('editProp', { name: p.name }),
    } : {}

    const addLink = (defaults: Editing['defaults']) => canEdit && (
        <button type="button" className="pl-link self-start" onClick={() => setEditing({ prop: null, defaults })}>
            <Plus />{t('addProp')}
        </button>
    )

    // Wpis bez kafelka z ikoną i bez numeru REK (numer jest w karcie rekwizytu); znaczki tylko tam, gdzie coś wymaga uwagi.
    const propItem = (p: StructuredProp, withScene = false) => (
        <li key={p.id} {...editProps(p)}>
            {withScene && <span className="sp-scene__n" style={{ width: 'auto', minWidth: 44 }}>{p.code}</span>}
            <PropEntry name={p.name} how={p.how} where={p.where} small />
            {p.group && <GroupStatusBadge status={p.group.status} />}
            {p.castOnly && <span className="pl-tag"><Users />{t('castOnly', { cast: castLabel(p.castOnly) ?? '' })}</span>}
        </li>
    )

    const sceneRow = (s: StructuredScene) => {
        const isOpen = openScene === s.id
        return (
            <li key={s.id}>
                <button
                    type="button"
                    className={`sp-scene w-full text-left ${isOpen ? 'is-open' : ''}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpenScene(isOpen ? null : s.id)}
                    disabled={s.props.length === 0 && !canEdit}
                >
                    <span className="sp-scene__n">{s.code}</span>
                    <span className="sp-scene__name">{s.name}</span>
                    <span className="rk-tally">{s.props.length}</span>
                    {isOpen ? <ChevronDown /> : ROW_ARROW}
                </button>
                {isOpen && (
                    <div className="flex flex-col gap-3" style={{ marginBottom: 12 }}>
                        <ul className="sp-props" style={{ marginLeft: 56 }}>{s.props.map(p => propItem(p))}</ul>
                        <div style={{ marginLeft: 56 }}>{addLink({ scene: s.number, act: null })}</div>
                    </div>
                )}
            </li>
        )
    }

    const section = (id: string, title: string, tally: string, children: ReactNode) => (
        <section className="pl-sect" aria-labelledby={id} key={id}>
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id={id}>{title}</h2>
                <span className="rk-tally">{tally}</span>
            </div>
            {children}
        </section>
    )

    const propsTally = (n: number) => plural(n, ['rekwizyt', 'rekwizyty', 'rekwizytów'])

    const byScenes = (
        <>
            {structure.preparation.length > 0 && section(
                'sd-prep', t('preparation'),
                propsTally(structure.preparation.reduce((n, s) => n + s.props.length, 0)),
                <ul className="pl-list sp-scenes">{structure.preparation.map(sceneRow)}</ul>
            )}
            {structure.acts.map(act => {
                const expanded = expandedActs.includes(act.act)
                const visible = expanded ? act.scenes : act.scenes.slice(0, VISIBLE_SCENES)
                const hidden = act.scenes.slice(VISIBLE_SCENES)
                const tally = act.scenes.length > 0
                    ? `${plural(act.scenes.length, ['scena', 'sceny', 'scen'])} · ${propsTally(act.propCount)}`
                    : propsTally(act.propCount)
                return section(`sd-act-${act.act}`, t('act', { act: roman(act.act) }), tally, (
                    <>
                        {act.actProps.length > 0 && <ul className="sp-props" style={{ marginLeft: 0 }}>{act.actProps.map(p => propItem(p))}</ul>}
                        {act.scenes.length > 0 && <ul className="pl-list sp-scenes">{visible.map(sceneRow)}</ul>}
                        {!expanded && hidden.length > 0 && (
                            <button type="button" className="pl-link self-start" onClick={() => setExpandedActs(a => [...a, act.act])}>
                                {t('showScenes', { from: hidden[0].code, to: hidden[hidden.length - 1].code })}
                                <ChevronDown />
                            </button>
                        )}
                        {act.scenes.length === 0 && addLink({ scene: null, act: act.act })}
                    </>
                ))
            })}
            {structure.unassigned.length > 0 && section(
                'sd-unassigned', t('unassigned'), propsTally(structure.unassigned.length),
                <ul className="sp-props" style={{ marginLeft: 0 }}>{structure.unassigned.map(p => propItem(p))}</ul>
            )}
            {/* Akt I ze sceną 1 to punkt wyjścia po dodaniu spektaklu, a nie gotowy podział: podpowiadamy dalej. */}
            {!structure.actsOnly && structure.acts.length <= 1 && structure.sceneCount <= 1 && (
                <EmptyState
                    art={structure.props.length === 0 ? 'closed' : undefined}
                    compact={structure.props.length > 0}
                    title={t('emptyTitle')}
                    actions={canEdit && (
                        <>
                            <Link className="rk-btn rk-btn--primary" href={`/performances/${performance.id}/props`}>{t('arrangeScenes')}</Link>
                            {structure.props.length === 0 && (
                                <button type="button" className="rk-btn rk-btn--ghost" onClick={() => setEditing({ prop: null, defaults: { scene: null, act: null } })}>
                                    {t('addPropFirst')}
                                </button>
                            )}
                        </>
                    )}
                >
                    {structure.acts.length === 0 ? t('emptyText') : t('baseText')}
                </EmptyState>
            )}
        </>
    )

    // „Wszystkie rekwizyty”: jedna płaska lista w kolejności rozpiski, z numerem sceny; bez odhaczania
    // (odhacza się tylko w liście zadań terminu).
    const allProps = structure.props.length > 0
        ? section('sd-all', t('viewAll'), propsTally(structure.props.length), (
            <ul className="sp-props" style={{ margin: 0, padding: 0, border: 0 }}>{structure.props.map(p => propItem(p, true))}</ul>
        ))
        : <p className="text-ink-muted">{t('emptyAll')}</p>

    const termHref = (id: string) => `/lists/${id}`

    return (
        <div className="hidden md:block">
            <main className="@container mx-auto flex max-w-[1200px] flex-col gap-8 px-12 pt-8 pb-12">
                <header className="flex flex-col gap-4">
                    <Link className="pl-back" href="/performances"><ChevronLeft />{t('back')}</Link>
                    <div className="flex min-w-0 items-end gap-6">
                            {performance.poster ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <SharedElement name={`show-poster-${performance.id}`}><span className="rk-poster rk-poster--md"><img src={performance.poster} alt="" /></span></SharedElement>
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <SharedElement name={`show-poster-${performance.id}`}><span className="rk-poster rk-poster--md rk-poster--empty"><img src="/brand/rekwizytor-znak-mono-bialy.svg" alt="" /></span></SharedElement>
                            )}
                            <div className="flex min-w-0 flex-col gap-2">
                                <ShowTitle title={performance.title} id="show-title" />
                                <span className="rk-tally">{meta}</span>
                            </div>
                    </div>
                    {/* Najbliższy termin i przyciski w jednym wierszu na całą szerokość; nie zawijają się pod tytuł. */}
                    <div className="flex flex-wrap items-center justify-between gap-6">
                            {nextTerm && (
                                <span className="rk-tally">
                                    {t('nearest')}: {termWhen(nextTerm)}
                                    {termDetail(nextTerm) && ` · ${termDetail(nextTerm)}`}
                                    {nextTerm.progress && nextTerm.progress.total > 0 && (
                                        <> · <span style={{ color: 'var(--kurtyna-text)' }}>{t('ready', { done: nextTerm.progress.done, total: nextTerm.progress.total })}</span></>
                                    )}
                                </span>
                            )}
                            <div className="rk-btn-group ml-auto">
                                <ActionMenu
                                    text={t('more')}
                                    label={t('actions', { title: performance.title })}
                                    items={[
                                        // Trzy segmenty po trzy pozycje (najwyżej): wydruki i dane z ikonami, potem edycje bez ikon,
                                        // na końcu usunięcie. Terminy tylko, gdy jakiś już jest: bez terminu „Zaplanuj termin” jest głównym przyciskiem obok.
                                        { type: 'button' as const, label: t('printLabels'), onSelect: () => { openLabels() }, icon: <Printer /> },
                                        { type: 'button' as const, label: t('exportPdf'), onSelect: () => { void exportPerformancePdf(exportData) }, icon: <FileDown /> },
                                        ...(canEdit ? [
                                            { label: t('editPerformance'), href: `/performances/${performance.id}/edit`, icon: <Pencil /> },
                                        ] : []),
                                        { type: 'separator' as const },
                                        ...(canEdit ? [
                                            { label: t('editBreakdown'), href: `/performances/${performance.id}/props` },
                                            ...(nextTerm ? [{ label: t('editDates'), href: `/performances/${performance.id}/schedule` }] : []),
                                            { type: 'separator' as const },
                                        ] : []),
                                        ...(canEdit ? [
                                            { type: 'button' as const, label: t('deletePerformance'), danger: true, onSelect: () => setConfirmDelete(true) },
                                        ] : []),
                                    ]}
                                />
                                {nextTerm ? (
                                    <Link className="rk-btn rk-btn--primary" href={termHref(nextTerm.id)}>{t('openList')}</Link>
                                ) : canEdit ? (
                                    <Link className="rk-btn rk-btn--primary" href={`/performances/${performance.id}/schedule`}>{t('schedule')}</Link>
                                ) : null}
                            </div>
                    </div>
                </header>

                <div className="grid items-start gap-12 @[760px]:grid-cols-[minmax(0,1fr)_288px]">
                    <div className="flex min-w-0 flex-col gap-8">
                        <div className="flex min-h-10 items-center justify-between gap-4">
                            <h2 className="st-title" style={{ fontSize: 20 }}>{t('breakdown')}</h2>
                            <div className="rk-tabs" role="tablist" aria-label={t('breakdownView')}>
                                <button className="rk-tab" role="tab" aria-selected={view === 'scenes'} onClick={() => setView('scenes')}>{t('viewScenes')}</button>
                                <button className="rk-tab" role="tab" aria-selected={view === 'all'} onClick={() => setView('all')}>{t('viewAll')}</button>
                            </div>
                        </div>
                        {view === 'scenes' ? byScenes : allProps}
                    </div>

                    <aside className="flex min-w-0 flex-col gap-8" aria-label={t('sideLabel')}>
                        <div className="hidden min-h-10 @[760px]:block" aria-hidden="true" />
                        {laterTerms.length > 0 && (
                            <section className="sp-side">
                                <div className="sp-side__head">
                                    <span className="rk-tally">{t('laterTerms')}</span>
                                    <Link className="pl-link" href="/calendar">{t('calendar')}<ChevronRight /></Link>
                                </div>
                                <ul className="sp-side__list">
                                    {laterTerms.map(term => {
                                        const d = new Date(term.showDate)
                                        return (
                                            <li key={term.id}>
                                                <Link className="sp-side__row" href={termHref(term.id)}>
                                                    <b>{weekdayShort(d)} {dayMonth(d)} · {time(d)}</b>
                                                    <small>{termDetail(term)}</small>
                                                    {term.progress && <span className="rk-fraction">{term.progress.done}/{term.progress.total}</span>}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        )}
                        <section className="sp-side">
                            <div className="sp-side__head"><span className="rk-tally">{t('related')}</span></div>
                            <ul className="sp-side__list">
                                <li>
                                    {/* Ekranu obsad jeszcze nie ma: wyjątki widać przy rekwizytach w płaskiej liście. */}
                                    <button type="button" className="sp-side__row w-full text-left" onClick={() => setView('all')}>
                                        <b>{t('castTitle')}</b>
                                        <small>{related.castExceptions > 0 ? plural(related.castExceptions, ['wyjątek', 'wyjątki', 'wyjątków']) : t('castNone')}</small>
                                        {ROW_ARROW}
                                    </button>
                                </li>
                                <li>
                                    <Link className="sp-side__row" href="/groups">
                                        <b>{t('fromStorage')}</b>
                                        <small>
                                            {related.groups > 0 ? plural(related.groups, ['grupa', 'grupy', 'grup']) : t('noGroups')}
                                            {related.groupAlert && <> · <span style={{ color: 'var(--warning)' }}>{related.groupAlert.label}</span></>}
                                        </small>
                                        {ROW_ARROW}
                                    </Link>
                                </li>
                                <li>
                                    <Link className="sp-side__row" href="/notes">
                                        <b>{t('notes')}</b>
                                        <small>
                                            {related.newMentions > 0
                                                ? <><span className="rk-count rk-count--new" aria-label={t('newCount', { count: related.newMentions })}>{related.newMentions}</span> {t('new')}</>
                                                : related.notes > 0 ? plural(related.notes, ['notatka', 'notatki', 'notatek']) : t('noNotes')}
                                        </small>
                                        {ROW_ARROW}
                                    </Link>
                                </li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </main>
            {confirmDelete && (
                <DeletePerformanceDialog
                    performance={performance}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
            {editing && (
                <PropEditDialog
                    performanceId={performance.id}
                    structure={structure}
                    groups={groups}
                    prop={editing.prop}
                    defaults={editing.defaults}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    )
}

// Potwierdzenie (karta Modal, --confirm): nazwa w pytaniu, w opisie skutki i że da się cofnąć.
function DeletePerformanceDialog({ performance, onCancel }: { performance: { id: string; title: string }; onCancel: () => void }) {
    const t = useTranslations('PerformanceDesktop')
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onCancel])

    const remove = () => startTransition(async () => {
        const result = await trashPerformance(performance.id)
        if (!result.ok) { notify.error(result.error ?? t('deleteFailed')); return }
        router.push('/performances')
        notify.undo(t('deleted', { title: performance.title }), t('undo'), async () => {
            const restored = await restorePerformance(performance.id)
            if (!restored.ok) { notify.error(restored.error ?? t('deleteFailed')); return }
            router.push(`/performances/${performance.id}`)
        })
    })

    return (
        <div className="rk-overlay fixed inset-0 z-50 rounded-none">
            <div className="rk-modal rk-modal--confirm" role="alertdialog" aria-labelledby="perf-del-title" aria-describedby="perf-del-desc">
                <div className="rk-modal__head">
                    <span className="rk-modal__icon rk-modal__icon--danger"><Trash2 /></span>
                    <div>
                        <h3 className="rk-modal__title" id="perf-del-title">{t('deleteTitle', { title: performance.title })}</h3>
                        <p className="rk-modal__desc" id="perf-del-desc">{t('deleteDesc')}</p>
                    </div>
                </div>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onCancel} autoFocus>{t('cancel')}</Button>
                    <Button variant="danger" onClick={remove} isLoading={pending} loadingLabel={t('deleting')}>{t('deleteConfirm')}</Button>
                </div>
            </div>
        </div>
    )
}
