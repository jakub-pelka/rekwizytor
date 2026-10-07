'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, Plus, Users } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { MobileTop } from '@/components/rk/MobileTop'
import { ShowTitle } from '@/components/rk/ShowTitle'
import { PropEntry } from '@/components/rk/PropEntry'
import { GroupStatusBadge } from '@/components/rk/GroupStatus'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { PropEditDialog, type GroupOption } from './PropEditDialog'
import type { PerformanceStructure, StructuredProp, StructuredScene } from '@/lib/performance-structure'
import { castLabel, dayMonth, isSameDay, plural, relativeDay, roman, time, weekdayShort } from '@/lib/rk-format'

export type PhoneShowList = { id: string; show_date: string; kind: string; cast: string | null }
export type PhoneNote = { id: string; title: string }

type Props = {
    performance: { id: string; title: string; venue: string | null }
    structure: PerformanceStructure
    lists: PhoneShowList[]
    /** Lista, którą otwiera główny przycisk: dzisiejsza albo najbliższa. */
    currentListId: string | null
    notes: PhoneNote[]
    newMentions: number
    canEdit: boolean
    groups: GroupOption[]
    now: string
}

type Editing = { prop: StructuredProp | null; defaults?: { scene: number | null; act: number | null } }

type Tab = 'scenes' | 'cast' | 'dates' | 'notes'

/** Ile scen aktu pokazujemy, zanim pojawi się „Pokaż sceny I.7–I.8”. */
const VISIBLE_SCENES = 6

// Ekran spektaklu na telefonie („Spektakl-telefon”).
export function PerformancePhone({ performance, structure, lists, currentListId, notes, newMentions, canEdit, groups, now }: Props) {
    const t = useTranslations('PerformancePhone')
    const [tab, setTab] = useState<Tab>('scenes')
    const [openScene, setOpenScene] = useState<string | null>(null)
    const [expandedActs, setExpandedActs] = useState<number[]>([])
    const [editing, setEditing] = useState<Editing | null>(null)
    const nowDate = new Date(now)

    const meta = [
        performance.venue,
        structure.actCount > 0 && plural(structure.actCount, ['akt', 'akty', 'aktów']),
        structure.sceneCount > 0 && plural(structure.sceneCount, ['scena', 'sceny', 'scen']),
        plural(structure.props.length, ['rekwizyt', 'rekwizyty', 'rekwizytów']),
    ].filter(Boolean).join(' · ')

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

    const propItem = (p: StructuredProp) => (
        <li key={p.id} {...editProps(p)}>
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
                    {isOpen ? <ChevronDown /> : <ChevronRight />}
                </button>
                {isOpen && (
                    <div className="flex flex-col gap-3" style={{ marginLeft: 20, marginBottom: 12 }}>
                        <ul className="sp-props" style={{ margin: 0 }}>{s.props.map(propItem)}</ul>
                        {addLink({ scene: s.number, act: null })}
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

    const scenesTab = (
        <>
            {structure.preparation.length > 0 && section(
                'sp-prep', t('preparation'),
                plural(structure.preparation.reduce((n, s) => n + s.props.length, 0), ['rekwizyt', 'rekwizyty', 'rekwizytów']),
                <ul className="pl-list sp-scenes">{structure.preparation.map(sceneRow)}</ul>
            )}
            {structure.acts.map(act => {
                const expanded = expandedActs.includes(act.act)
                const visible = expanded ? act.scenes : act.scenes.slice(0, VISIBLE_SCENES)
                const hidden = act.scenes.slice(VISIBLE_SCENES)
                const tally = act.scenes.length > 0
                    ? `${plural(act.scenes.length, ['scena', 'sceny', 'scen'])} · ${act.propCount}`
                    : plural(act.propCount, ['rekwizyt', 'rekwizyty', 'rekwizytów'])
                return section(`sp-act-${act.act}`, t('act', { act: roman(act.act) }), tally, (
                    <>
                        {act.actProps.length > 0 && <ul className="sp-props" style={{ marginLeft: 0 }}>{act.actProps.map(propItem)}</ul>}
                        {act.scenes.length > 0 && <ul className="pl-list sp-scenes">{visible.map(sceneRow)}</ul>}
                        {!expanded && hidden.length > 0 && (
                            <button type="button" className="pl-link self-start" onClick={() => setExpandedActs(a => [...a, act.act])}>
                                {t('showScenes', { from: hidden[0].code, to: hidden[hidden.length - 1].code })}
                                <ChevronDown />
                            </button>
                        )}
                    </>
                ))
            })}
            {structure.unassigned.length > 0 && section(
                'sp-unassigned', t('unassigned'),
                plural(structure.unassigned.length, ['rekwizyt', 'rekwizyty', 'rekwizytów']),
                <ul className="sp-props" style={{ marginLeft: 0 }}>{structure.unassigned.map(propItem)}</ul>
            )}
            {structure.props.length === 0 && structure.acts.length === 0 && <p className="text-ink-muted">{t('emptyScenes')}</p>}
        </>
    )

    const castGroups = ['first', 'second'].map(cast => ({ cast, props: structure.props.filter(p => p.castOnly === cast) }))
    const castTab = castGroups.some(g => g.props.length > 0)
        ? castGroups.filter(g => g.props.length > 0).map(g => section(
            `sp-cast-${g.cast}`, t('castOnlyTitle', { cast: castLabel(g.cast) ?? '' }),
            plural(g.props.length, ['rekwizyt', 'rekwizyty', 'rekwizytów']),
            <ul className="sp-props" style={{ marginLeft: 0 }}>{g.props.map(propItem)}</ul>
        ))
        : <p className="text-ink-muted">{t('emptyCast')}</p>

    const datesTab = lists.length > 0
        ? section('sp-dates', t('upcoming'), String(lists.length), (
            <ul className="pl-list pl-list--date sl-list">
                {lists.map(l => {
                    const d = new Date(l.show_date)
                    const details = [
                        `${relativeDay(d, nowDate)} ${time(d)}`,
                        l.kind === 'rehearsal' && t('rehearsal'),
                        l.cast && t('castShort', { cast: castLabel(l.cast) ?? '' }),
                    ].filter(Boolean).join(' · ')
                    return (
                        <li key={l.id}>
                            <Link className="sl-row" href={`/lists/${l.id}`}>
                                <span className={`pl-date ${isSameDay(d, nowDate) ? 'is-today' : ''}`}>
                                    <small>{weekdayShort(d)}</small><b>{dayMonth(d)}</b>
                                </span>
                                <span className="pl-main"><b>{t('taskList')}</b><small>{details}</small></span>
                                <ChevronRight />
                            </Link>
                        </li>
                    )
                })}
            </ul>
        ))
        : <p className="text-ink-muted">{t('emptyDates')}</p>

    const notesTab = notes.length > 0
        ? section('sp-notes', t('notes'), String(notes.length), (
            <ul className="pl-list sl-list">
                {notes.map(n => (
                    <li key={n.id}>
                        <Link className="sl-row" href={`/notes/${n.id}`}>
                            <span className="pl-main"><b>{n.title}</b></span>
                            <ChevronRight />
                        </Link>
                    </li>
                ))}
            </ul>
        ))
        : <p className="text-ink-muted">{t('emptyNotes')}</p>

    const tabs: { id: Tab; label: string; badge?: number }[] = [
        { id: 'scenes', label: t('tabScenes') },
        { id: 'cast', label: t('tabCast') },
        { id: 'dates', label: t('tabDates') },
        { id: 'notes', label: t('tabNotes'), badge: newMentions },
    ]

    return (
        <div className="md:hidden">
            <MobileTop
                back={{ href: '/performances', label: t('back') }}
                title={performance.title}
                anchorId="show-title"
                actions={canEdit && (
                    <ActionMenu
                        label={t('actions', { title: performance.title })}
                        items={[
                            { type: 'button', label: t('addProp'), onSelect: () => setEditing({ prop: null }) },
                            { type: 'separator' },
                            { label: t('editPerformance'), href: `/performances/${performance.id}/edit` },
                            { label: t('editScenes'), href: `/performances/${performance.id}/scenes` },
                            { label: t('editProps'), href: `/performances/${performance.id}/props` },
                            { label: t('editDates'), href: `/performances/${performance.id}/schedule` },
                        ]}
                    />
                )}
            />
            <div className="flex flex-col gap-6 px-4 pt-2 pb-8">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <ShowTitle title={performance.title} phone id="show-title" />
                        <span className="rk-tally">{meta}</span>
                    </div>
                    {currentListId && (
                        <Link className="rk-btn rk-btn--primary rk-btn--lg w-full" href={`/lists/${currentListId}`}>
                            {t('openList')}
                        </Link>
                    )}
                    <div className="rk-tabs flex self-stretch" role="tablist" aria-label={t('tabsLabel')}>
                        {tabs.map(tb => (
                            <button
                                key={tb.id}
                                className="rk-tab inline-flex flex-1 items-center justify-center gap-1"
                                role="tab"
                                aria-selected={tab === tb.id}
                                onClick={() => setTab(tb.id)}
                            >
                                {tb.label}
                                {!!tb.badge && <span className="rk-count rk-count--new" aria-label={t('newCount', { count: tb.badge })}>{tb.badge > 99 ? '99+' : tb.badge}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                {tab === 'scenes' && scenesTab}
                {tab === 'cast' && castTab}
                {tab === 'dates' && datesTab}
                {tab === 'notes' && notesTab}
            </div>
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
