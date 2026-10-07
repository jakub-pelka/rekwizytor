'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Box, Camera, ChevronDown, ChevronRight, Layers, Plus, QrCode, ScanLine, Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/routing'
import { ContainerDialog } from './ContainerDialog'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { MobileTop, MobileBrand } from '@/components/rk/MobileTop'
import { RkIcon } from '@/components/rk/RkIcon'
import { GROUP_STATUS } from '@/components/rk/GroupStatus'
import { EmptyState } from '@/components/rk/EmptyState'
import {
    groupAlert, locationPath, sortGroups, sortLocations, subtreeIds,
    type StorageData, type StorageGroup, type StorageItem, type StorageLocation,
} from '@/lib/storage'
import { plural } from '@/lib/rk-format'

type Props = { data: StorageData; roomId: string | null; canEdit: boolean }

const KIND_LABEL: Record<string, string> = { wardrobe: 'szafa', shelf: 'półka', trunk: 'kufer', box: 'pudło', container: 'pojemnik' }

// Magazyn jak pliki i foldery (karta Magazyn, ekrany „Magazyn”, „Magazyn-telefon”, „Magazyn-szukaj”).
export function StorageView({ data, roomId, canEdit }: Props) {
    const t = useTranslations('Storage')
    const router = useRouter()
    const { locations, groups } = data
    const room = roomId ? locations.find(l => l.id === roomId) ?? null : null
    const [query, setQuery] = useState('')
    const [scoped, setScoped] = useState(true)
    const [performance, setPerformance] = useState('')
    const [jump, setJump] = useState<string | null>(null)
    const [open, setOpen] = useState<Set<string>>(new Set())
    const [adding, setAdding] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const [addingContainer, setAddingContainer] = useState(false)
    const highlight = useSearchParams().get('highlight')

    // Deep link ?highlight= (np. po skanie QR): przewinięcie i mignięcie obwódką stanu (2 px, kolor focus).
    useEffect(() => {
        if (!highlight) return
        const el = document.querySelector<HTMLElement>(`[data-hl="${CSS.escape(highlight)}"]`)
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        el.style.outline = '2px solid var(--focus)'
        el.style.outlineOffset = '2px'
        const id = setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = '' }, 2400)
        return () => clearTimeout(id)
    }, [highlight])

    const parentOptions = locations
        .filter(l => !l.parentId || locationPath(locations, l.id).length <= 3)
        .map(l => ({ id: l.id, label: locationPath(locations, l.id).map(p => p.name).join(' › ') }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pl'))

    const children = (parentId: string | null) => sortLocations(locations.filter(l => l.parentId === parentId))
    const performances = useMemo(() => {
        const map = new Map<string, string>()
        for (const g of groups) for (const p of g.performances) map.set(p.id, p.title)
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pl'))
    }, [groups])

    const visibleGroup = (g: StorageGroup) => !performance || g.performances.some(p => p.id === performance)
    const groupsIn = (locationId: string | null) => sortGroups(groups.filter(g => g.locationId === locationId && visibleGroup(g)))
    const roomIds = room ? subtreeIds(locations, room.id) : null
    const unassigned = groupsIn(null)
    const looseIn = (locationId: string) => performance ? [] : data.looseItems.filter(i => i.locationId === locationId)

    const pathLabel = (locationId: string | null, extra?: string) =>
        [...locationPath(locations, locationId).filter(l => !room || l.id !== room.id).map(l => l.name), extra].filter(Boolean).join(' › ')

    // --- wiersze -------------------------------------------------------------------------

    const hit = (text: string) => {
        if (!query) return text
        const i = text.toLocaleLowerCase('pl').indexOf(query.toLocaleLowerCase('pl'))
        if (i < 0) return text
        return <>{text.slice(0, i)}<mark className="rk-inv-hit">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>
    }

    const alertBadge = (g: StorageGroup) => {
        const a = groupAlert(g)
        if (!a) return null
        const label = GROUP_STATUS[a.status].label.toLocaleLowerCase('pl')
        return <span className={`rk-badge rk-badge--${GROUP_STATUS[a.status].tone}`}>{`${a.count} ${label}`}</span>
    }

    const groupMeta = (g: StorageGroup, withPath = false) => (
        <small>
            {g.code && <span className="rk-id">{g.code}</span>}
            {withPath && <span className="rk-inv-path">{`· ${pathLabel(g.locationId) || t('unassigned')}`}</span>}
            {g.approxCount != null && <span>{`· ${t('general')} · ${t('approx', { count: g.approxCount })}`}</span>}
            {g.items.length > 0 && <span>{`· ${t('itemized', { count: g.items.length })}`}</span>}
            {!withPath && g.approxCount == null && g.items.length === 0 && g.description && <span>{`· ${g.description}`}</span>}
        </small>
    )

    const performancesLabel = (g: StorageGroup) => g.performances.map(p => p.title).join(', ') || '—'

    const itemRow = (i: StorageItem, g: StorageGroup | null, withPath = false) => (
        <li key={i.id} className="relative" data-hl={i.id}>
            <Link className="rk-inv-row rk-inv-row--item" href={g ? `/groups/${g.id}` : `/groups?room=${room?.id ?? ''}`}>
                <span className="rk-inv-ico" title={t('roleItem')}><RkIcon name="metka" /></span>
                <span className="rk-inv-text">
                    <b>{hit(i.name)}</b>
                    <small>
                        {i.code && <span className="rk-id">{i.code}</span>}
                        {withPath && <span className="rk-inv-path">{`· ${pathLabel(g?.locationId ?? i.locationId, g?.name)}`}</span>}
                    </small>
                </span>
                <span className="rk-inv-sp hidden md:block">{g ? performancesLabel(g) : '—'}</span>
                <span className={`rk-badge rk-badge--${i.status === 'available' ? 'success' : GROUP_STATUS[i.status].tone}`}>
                    {i.status === 'available' ? t('inPlace') : GROUP_STATUS[i.status].label}
                </span>
            </Link>
        </li>
    )

    const groupRow = (g: StorageGroup, withPath = false) => {
        const isOpen = open.has(g.id)
        const content = (
            <>
                <span className="rk-inv-ico rk-inv-ico--group" title={t('roleGroup')}><Layers /></span>
                <span className="rk-inv-text"><b>{hit(g.name)}</b>{groupMeta(g, withPath)}</span>
                <span className="rk-inv-sp hidden md:block">{performancesLabel(g)}</span>
                {alertBadge(g)}
                {g.items.length > 0 && !withPath ? (isOpen ? <ChevronDown /> : <ChevronRight />) : <ChevronRight />}
            </>
        )
        return (
            <li key={g.id} className="relative" data-hl={g.id}>
                {g.items.length > 0 && !withPath ? (
                    <button
                        type="button"
                        className={`rk-inv-row rk-inv-row--group w-full text-left ${isOpen ? 'is-open' : ''}`}
                        aria-expanded={isOpen}
                        onClick={() => setOpen(prev => { const n = new Set(prev); if (isOpen) n.delete(g.id); else n.add(g.id); return n })}
                    >
                        {content}
                    </button>
                ) : (
                    <Link className="rk-inv-row rk-inv-row--group" href={`/groups/${g.id}`}>{content}</Link>
                )}
                {isOpen && (
                    <ul className="rk-inv-items">
                        {g.items.map(i => itemRow(i, g))}
                        {canEdit && (
                            <li className="rk-inv-add">
                                {adding === g.id
                                    ? <AddItemInline groupId={g.id} onDone={() => { setAdding(null); router.refresh() }} />
                                    : <button type="button" className="pl-link" onClick={() => setAdding(g.id)}><Plus />{t('itemizeNext')}</button>}
                            </li>
                        )}
                    </ul>
                )}
            </li>
        )
    }

    const containerRow = (l: StorageLocation, withPath = false) => {
        const inside = subtreeIds(locations, l.id)
        const gs = groups.filter(g => g.locationId && inside.has(g.locationId))
        const rootRoom = locationPath(locations, l.id)[0]
        return (
            <li key={l.id} className="relative">
                <Link className="rk-inv-row rk-inv-row--box" href={`/groups?room=${rootRoom?.id ?? l.id}`}>
                    <span className="rk-inv-ico rk-inv-ico--box" title={t('roleBox')}><Box /></span>
                    <span className="rk-inv-text">
                        <b>{hit(l.name)}</b>
                        <small>
                            {l.code && <span className="rk-id">{l.code}</span>}
                            {withPath && <span className="rk-inv-path">{`· ${pathLabel(l.parentId)}`}</span>}
                            <span>{`· ${plural(gs.length, ['grupa', 'grupy', 'grup'])}`}</span>
                        </small>
                    </span>
                    <ChevronRight />
                </Link>
            </li>
        )
    }

    const section = (id: string, title: ReactNode, tally: string, children: ReactNode, action?: ReactNode) => (
        <section key={id} className="pl-sect" aria-labelledby={id}>
            <div className="pl-sect-head pl-sect-head--rule">
                <h2 className="pl-h2" id={id}>{title}</h2>
                {action ?? <span className="rk-tally">{tally}</span>}
            </div>
            {children}
        </section>
    )

    // --- widok pomieszczenia: sekcje pojemników, półki jako podtytuły, głębiej wiersze ----------------

    const containerSection = (c: StorageLocation) => {
        const own = groupsIn(c.id)
        const shelves = children(c.id)
        const count = groups.filter(g => g.locationId && subtreeIds(locations, c.id).has(g.locationId) && visibleGroup(g)).length
        return section(
            `inv-${c.id}`,
            <>{c.name}{c.code && <span className="rk-inv-kind">{[KIND_LABEL[c.kind], c.code].filter(Boolean).join(' · ')}</span>}</>,
            plural(count, ['grupa', 'grupy', 'grup']),
            <div className="flex flex-col">
                {(own.length > 0 || looseIn(c.id).length > 0) && (
                    <ul className="rk-inv-list pl-list">{own.map(g => groupRow(g))}{looseIn(c.id).map(i => itemRow(i, null))}</ul>
                )}
                {shelves.map(s => (
                    <div key={s.id} className="rk-inv-shelf mt-3">
                        <div className="rk-inv-shelf__head max-md:!pl-0">{s.name}{s.code && <span className="rk-id">{s.code}</span>}</div>
                        <ul className="rk-inv-list pl-list max-md:!pl-0">
                            {groupsIn(s.id).map(g => groupRow(g))}
                            {looseIn(s.id).map(i => itemRow(i, null))}
                            {children(s.id).map(deep => containerRow(deep))}
                        </ul>
                    </div>
                ))}
                {own.length === 0 && shelves.length === 0 && looseIn(c.id).length === 0 && <p className="pl-meta">{t('emptyContainer')}</p>}
            </div>,
        )
    }

    // --- wyszukiwanie w miejscu: widok płaski z pełną ścieżką ---------------------------------------

    const q = query.trim().toLocaleLowerCase('pl')
    const matches = (text: string | null) => !!text && text.toLocaleLowerCase('pl').includes(q)
    const inScope = (locationId: string | null) => !room || !scoped || (!!locationId && roomIds!.has(locationId))
    const results = q ? {
        groups: groups.filter(g => visibleGroup(g) && (matches(g.name) || matches(g.code) || matches(g.description))),
        items: [
            ...groups.flatMap(g => g.items.filter(i => matches(i.name) || matches(i.code)).map(i => ({ i, g: g as StorageGroup | null }))),
            ...data.looseItems.filter(i => matches(i.name) || matches(i.code)).map(i => ({ i, g: null as StorageGroup | null })),
        ],
        containers: locations.filter(l => l.parentId && (matches(l.name) || matches(l.code))),
    } : null
    const scopedResults = results && {
        groups: results.groups.filter(g => inScope(g.locationId)),
        items: results.items.filter(({ i, g }) => inScope(g?.locationId ?? i.locationId)),
        containers: results.containers.filter(l => inScope(l.id)),
    }
    const total = (r: typeof results) => r ? r.groups.length + r.items.length + r.containers.length : 0
    const outside = results && scopedResults ? total(results) - total(scopedResults) : 0
    const outsideNames = results && scopedResults
        ? [...results.groups.filter(g => !scopedResults.groups.includes(g)).map(g => g.name), ...results.items.filter(x => !scopedResults.items.includes(x)).map(x => x.i.name)].slice(0, 2)
        : []

    // --- układ --------------------------------------------------------------------------------------

    const roomContainers = room ? children(room.id) : []
    const loose = room ? groupsIn(room.id) : []
    const shownContainers = jump && jump !== 'unassigned' ? roomContainers.filter(c => c.id === jump) : roomContainers
    const title = room?.name ?? t('title')

    const actions = canEdit && (
        <div className="flex flex-wrap gap-3">
            {room && <button type="button" className="rk-btn rk-btn--ghost" onClick={() => setAddingContainer(true)}><Plus />{t('addContainer')}</button>}
            <Link className="rk-btn rk-btn--ghost" href={room ? `/groups/organize?room=${room.id}` : '/groups/organize'}><SlidersHorizontal />{t('organize')}</Link>
            <Link className="rk-btn rk-btn--secondary" href="/scan/label"><ScanLine />{t('scan')}</Link>
            <Link className="rk-btn rk-btn--primary" href={room ? `/scan?in=${room.id}` : '/scan'}><Camera />{t('addFromPhoto')}</Link>
        </div>
    )

    return (
        <div>
            {addingContainer && room && <ContainerDialog parents={parentOptions} defaultParent={room.id} onClose={() => setAddingContainer(false)} />}
            <MobileTop
                brand={<MobileBrand />}
                actions={<>
                    <Link href="/scan/label" className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('scanLabel')}><QrCode /></Link>
                    <Link href={room ? `/scan?in=${room.id}` : '/scan'} className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('addFromPhoto')}><Camera /></Link>
                </>}
            />
            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:px-12 md:pt-8 md:pb-12">
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0 max-md:!block">
                    <div>
                        <p className="rk-page-header__eyebrow hidden md:block">{t('eyebrow')}</p>
                        <h1 className="rk-page-header__title">{room ? <span className="hidden md:inline">{title}</span> : title}{room && <span className="md:hidden">{t('title')}</span>}</h1>
                    </div>
                    <div className="hidden md:block">{actions}</div>
                </header>

                <div className="flex flex-col gap-4">
                    <nav className="rk-inv-crumbs" aria-label={t('crumbs')}>
                        {room ? (
                            <>
                                <Link className="rk-inv-crumb" href="/groups">{t('storage')}</Link>
                                <span><ChevronRight /></span>
                                <span className="rk-inv-crumb is-current">{room.name}</span>
                            </>
                        ) : <span className="rk-inv-crumb is-current">{t('storage')}</span>}
                    </nav>

                    <div className="flex gap-3">
                        <label className="rk-find flex-1">
                            <Search />
                            {room && scoped && (
                                <span className="rk-find__scope">
                                    {t('scope', { name: room.name })}
                                    <button type="button" aria-label={t('scopeRemove')} onClick={() => setScoped(false)}><X /></button>
                                </span>
                            )}
                            <input
                                data-rk-find
                                ref={searchRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={t('searchPlaceholder')}
                                aria-label={t('searchPlaceholder')}
                            />
                        </label>
                        {performances.length > 0 && (
                            <span className="rk-select hidden md:inline-flex">
                                <select value={performance} onChange={e => setPerformance(e.target.value)} aria-label={t('performanceFilter')}>
                                    <option value="">{t('allPerformances')}</option>
                                    {performances.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                                </select>
                                <ChevronDown />
                            </span>
                        )}
                    </div>

                    {room && !q && (
                        <div className="rk-inv-jump-scroll md:!mr-0 md:!overflow-visible">
                            <div className="rk-inv-jump overflow-x-auto md:!flex-wrap" role="group" aria-label={t('jump')}>
                                <button className="rk-chip" aria-pressed={!jump} onClick={() => setJump(null)}>
                                    {t('all')}<span className="rk-chip__n">{groups.filter(g => g.locationId && roomIds!.has(g.locationId)).length + unassigned.length}</span>
                                </button>
                                {roomContainers.map(c => (
                                    <button key={c.id} className="rk-chip" aria-pressed={jump === c.id} onClick={() => setJump(c.id)}>
                                        {c.name}<span className="rk-chip__n">{groups.filter(g => g.locationId && subtreeIds(locations, c.id).has(g.locationId)).length}</span>
                                    </button>
                                ))}
                                {unassigned.length > 0 && (
                                    <button className="rk-chip" aria-pressed={jump === 'unassigned'} onClick={() => setJump('unassigned')}>
                                        {t('unassigned')}<span className="rk-chip__n">{unassigned.length}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-8 md:gap-12">
                    {groups.length === 0 && data.looseItems.length === 0 && !q ? (
                        <EmptyState
                            art="closed"
                            title={t('emptyTitle')}
                            actions={canEdit && <>
                                <Link className="rk-btn rk-btn--primary rk-btn--lg max-md:w-full" href="/scan"><Camera />{t('emptyPhoto')}</Link>
                                <Link className="rk-btn rk-btn--ghost" href="/groups?create=1">{t('emptyManual')}</Link>
                            </>}
                        >
                            {t('emptyText')}
                        </EmptyState>
                    ) : scopedResults ? (
                        <>
                            {section('inv-results', room && scoped ? t('resultsIn', { name: room.name }) : t('results'),
                                plural(total(scopedResults), ['wynik', 'wyniki', 'wyników']),
                                total(scopedResults) > 0 ? (
                                    <ul className="rk-inv-list pl-list">
                                        {scopedResults.groups.map(g => groupRow(g, true))}
                                        {scopedResults.containers.map(l => containerRow(l, true))}
                                        {scopedResults.items.map(({ i, g }) => itemRow(i, g, true))}
                                    </ul>
                                ) : (
                                    <EmptyState
                                        title={t('noResultsTitle', { query: query.trim() })}
                                        actions={room && scoped && <button type="button" className="rk-btn rk-btn--secondary max-md:w-full" onClick={() => setScoped(false)}>{t('searchEverywhereShort')}</button>}
                                    >
                                        {room && scoped ? t('noResultsScoped', { name: room.name }) : t('noResults')}
                                    </EmptyState>
                                ),
                            )}
                            {room && scoped && outside > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <b className="font-semibold text-ink">{t('outside', { count: outside })}</b>
                                        <span className="pl-meta">{outsideNames.join(', ')}</span>
                                    </div>
                                    <button type="button" className="rk-btn rk-btn--secondary rk-btn--sm" onClick={() => setScoped(false)}>{t('searchEverywhere')}</button>
                                </div>
                            )}
                        </>
                    ) : room ? (
                        <>
                            {jump !== 'unassigned' && shownContainers.map(containerSection)}
                            {!jump && loose.length > 0 && section('inv-loose', t('loose'), plural(loose.length, ['grupa', 'grupy', 'grup']),
                                <ul className="rk-inv-list pl-list">{loose.map(g => groupRow(g))}</ul>)}
                            {(!jump || jump === 'unassigned') && unassigned.length > 0 && section('inv-unassigned', t('unassigned'), plural(unassigned.length, ['grupa', 'grupy', 'grup']),
                                <ul className="rk-inv-list pl-list">{unassigned.map(g => groupRow(g))}</ul>)}
                        </>
                    ) : (
                        <>
                            {section('inv-rooms', t('rooms'), plural(children(null).length, ['pomieszczenie', 'pomieszczenia', 'pomieszczeń']),
                                <ul className="rk-inv-list pl-list">
                                    {children(null).map(r => {
                                        const inside = subtreeIds(locations, r.id)
                                        const count = groups.filter(g => g.locationId && inside.has(g.locationId)).length
                                        return (
                                            <li key={r.id} className="relative">
                                                <Link className="rk-inv-row rk-inv-row--box" href={`/groups?room=${r.id}`}>
                                                    <span className="rk-inv-ico rk-inv-ico--box"><Box /></span>
                                                    <span className="rk-inv-text">
                                                        <b>{r.name}</b>
                                                        <small><span>{[plural(children(r.id).length, ['pojemnik', 'pojemniki', 'pojemników']), plural(count, ['grupa', 'grupy', 'grup'])].join(' · ')}</span></small>
                                                    </span>
                                                    <ChevronRight />
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>,
                            )}
                            {unassigned.length > 0 && section('inv-unassigned', t('unassigned'), plural(unassigned.length, ['grupa', 'grupy', 'grup']),
                                <ul className="rk-inv-list pl-list">{unassigned.map(g => groupRow(g))}</ul>)}
                        </>
                    )}

                    <div className="rk-inv-legend" aria-hidden="true">
                        <span><span className="rk-inv-ico rk-inv-ico--box"><Box /></span>{t('roleBox')}</span>
                        <span><span className="rk-inv-ico rk-inv-ico--group"><Layers /></span>{t('roleGroup')}</span>
                        <span><span className="rk-inv-ico"><RkIcon name="metka" /></span>{t('roleItem')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// „Rozpisz kolejny przedmiot”: jedno pole z nazwą; numer REK- nadaje baza.
function AddItemInline({ groupId, onDone }: { groupId: string; onDone: () => void }) {
    const t = useTranslations('Storage')
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const save = async () => {
        if (!name.trim()) { onDone(); return }
        setSaving(true)
        const { error } = await createClient().from('group_items').insert({ group_id: groupId, name: name.trim() })
        setSaving(false)
        if (error) { notify.error(t('itemFailed')); return }
        onDone()
    }
    return (
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void save() }}>
            <input className="rk-input flex-1" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('itemPlaceholder')} aria-label={t('itemPlaceholder')} />
            <button type="submit" className="rk-btn rk-btn--secondary rk-btn--sm" disabled={saving}>{t('itemAdd')}</button>
        </form>
    )
}

