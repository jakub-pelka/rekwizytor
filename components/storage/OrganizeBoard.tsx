'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronRight, GripVertical, Layers, LoaderCircle } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { GROUP_STATUS } from '@/components/rk/GroupStatus'
import { groupAlert, sortGroups, sortLocations, type StorageData, type StorageGroup } from '@/lib/storage'
import { time } from '@/lib/rk-format'

type Props = { data: StorageData; roomId: string | null; canEdit: boolean }
type Columns = { id: string; title: string; groupIds: string[] }[]

const UNASSIGNED = 'unassigned'

// Porządkowanie (karta Porzadkowanie): przeciąganie grup między miejscami, zapis buforowany w tle.
// Kolumny i karty stoją w tej samej kolejności co sekcje i wiersze magazynu.
export function OrganizeBoard({ data, roomId, canEdit }: Props) {
    const t = useTranslations('Organize')
    const router = useRouter()
    const room = data.locations.find(l => l.id === roomId) ?? null
    const groupsById = new Map(data.groups.map(g => [g.id, g]))

    const [columns, setColumns] = useState<Columns>(() => {
        const containers = room ? sortLocations(data.locations.filter(l => l.parentId === room.id)) : []
        return [
            ...containers.map(c => ({ id: c.id, title: c.name, groupIds: sortGroups(data.groups.filter(g => g.locationId === c.id)).map(g => g.id) })),
            { id: UNASSIGNED, title: t('unassigned'), groupIds: sortGroups(data.groups.filter(g => !g.locationId)).map(g => g.id) },
        ]
    })
    const [dragging, setDragging] = useState<string | null>(null)
    const [drop, setDrop] = useState<{ column: string; index: number } | null>(null)
    const [saveState, setSaveState] = useState<{ pending: boolean; at: Date | null }>({ pending: false, at: null })
    const dirty = useRef(new Set<string>())
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const flush = useCallback(async () => {
        const cols = columnsRef.current
        const changed = [...dirty.current]
        dirty.current.clear()
        if (!changed.length) return
        setSaveState(s => ({ ...s, pending: true }))
        const supabase = createClient()
        const updates = cols.filter(c => changed.includes(c.id)).flatMap(c =>
            c.groupIds.map((id, i) => supabase.from('groups').update({ location_id: c.id === UNASSIGNED ? null : c.id, sort_order: i }).eq('id', id))
        )
        const results = await Promise.all(updates)
        if (results.some(r => r.error)) {
            changed.forEach(id => dirty.current.add(id))
            notify.error(t('saveFailed'))
            setSaveState(s => ({ ...s, pending: false }))
            return
        }
        setSaveState({ pending: false, at: new Date() })
    }, [t])

    const columnsRef = useRef(columns)
    useEffect(() => { columnsRef.current = columns }, [columns])

    const schedule = (ids: string[]) => {
        ids.forEach(id => dirty.current.add(id))
        setSaveState(s => ({ ...s, pending: true }))
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { void flush() }, 800)
    }

    const move = (groupId: string, toColumn: string, toIndex: number) => {
        let from = ''
        setColumns(prev => {
            const next = prev.map(c => ({ ...c, groupIds: [...c.groupIds] }))
            const source = next.find(c => c.groupIds.includes(groupId))!
            from = source.id
            const oldIndex = source.groupIds.indexOf(groupId)
            source.groupIds.splice(oldIndex, 1)
            const target = next.find(c => c.id === toColumn)!
            const index = source === target && oldIndex < toIndex ? toIndex - 1 : toIndex
            target.groupIds.splice(Math.max(0, Math.min(index, target.groupIds.length)), 0, groupId)
            return next
        })
        schedule([toColumn, from].filter(Boolean))
    }

    const done = async () => {
        if (timer.current) clearTimeout(timer.current)
        await flush()
        router.push(room ? `/groups?room=${room.id}` : '/groups')
        router.refresh()
    }

    const card = (g: StorageGroup, column: string, index: number) => {
        const a = groupAlert(g)
        const meta = [g.approxCount != null && `${t('general')} · ${t('approx', { count: g.approxCount })}`, g.items.length > 0 && t('itemized', { count: g.items.length })].filter(Boolean).join(' · ')
        return (
            <li
                key={g.id}
                className={`rk-inv-card ${dragging === g.id ? 'is-lifted' : ''}`}
                draggable={canEdit}
                onDragStart={e => { e.dataTransfer.setData('text/plain', g.id); e.dataTransfer.effectAllowed = 'move'; setDragging(g.id) }}
                onDragEnd={() => { setDragging(null); setDrop(null) }}
                onDragOver={e => {
                    if (!dragging) return
                    e.preventDefault()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDrop({ column, index: e.clientY < rect.top + rect.height / 2 ? index : index + 1 })
                }}
            >
                <span className="rk-inv-grip" aria-hidden="true"><GripVertical /></span>
                <span className="rk-inv-ico rk-inv-ico--group"><Layers /></span>
                <span className="rk-inv-text">
                    <b>{g.name}</b>
                    <small>{g.code && <span className="rk-id">{g.code}</span>}{meta && ` · ${meta}`}</small>
                    {a && <span className={`rk-badge rk-badge--${GROUP_STATUS[a.status].tone}`}>{`${a.count} ${GROUP_STATUS[a.status].label.toLocaleLowerCase('pl')}`}</span>}
                </span>
                {/* Alternatywa bez przeciągania (dotyk, klawiatura). */}
                {canEdit && (
                    <span className="rk-select sr-only focus-within:not-sr-only">
                        <select aria-label={t('moveTo', { name: g.name })} value={column} onChange={e => move(g.id, e.target.value, Number.MAX_SAFE_INTEGER)}>
                            {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </span>
                )}
            </li>
        )
    }

    return (
        <div className="mx-auto flex max-w-[1184px] flex-col gap-8 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                <div>
                    <p className="rk-page-header__eyebrow">
                        <Link href="/groups" className="hover:text-ink">{t('storage')}</Link>
                        {room && <>{' › '}{room.name}</>}
                    </p>
                    <h1 className="rk-page-header__title">{t('title')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`rk-sync ${saveState.pending ? 'rk-sync--wait' : 'rk-sync--ok'}`} aria-live="polite">
                        {saveState.pending ? <LoaderCircle /> : <Check />}
                        {saveState.pending ? t('saving') : saveState.at ? t('savedAt', { time: time(saveState.at) }) : t('allSaved')}
                    </span>
                    <button type="button" className="rk-btn rk-btn--primary" onClick={done}>{t('done')}</button>
                </div>
            </header>

            <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('lead')}</p>

            <div className="rk-inv-board overflow-x-auto pb-4">
                {columns.map(c => (
                    <div
                        key={c.id}
                        className="rk-inv-col"
                        onDragOver={e => { if (dragging) { e.preventDefault(); if (!c.groupIds.length) setDrop({ column: c.id, index: 0 }) } }}
                        onDrop={e => {
                            e.preventDefault()
                            const id = e.dataTransfer.getData('text/plain')
                            if (id && drop) move(id, drop.column, drop.index)
                            setDragging(null)
                            setDrop(null)
                        }}
                    >
                        <div className="pl-sect-head pl-sect-head--rule">
                            <h2 className="pl-h2">{c.title}</h2>
                            <span className="rk-col__n">{c.groupIds.length}</span>
                        </div>
                        <ul className="rk-inv-cards">
                            {c.groupIds.map((id, i) => {
                                const g = groupsById.get(id)
                                if (!g) return null
                                return [
                                    drop?.column === c.id && drop.index === i && dragging !== id && <li key={`drop-${i}`} className="rk-inv-drop">{t('dropHere')}</li>,
                                    card(g, c.id, i),
                                ]
                            })}
                            {drop?.column === c.id && drop.index >= c.groupIds.length && <li className="rk-inv-drop">{t('dropHere')}</li>}
                        </ul>
                    </div>
                ))}
            </div>

            <Link className="pl-link" href={room ? `/groups?room=${room.id}` : '/groups'}>{t('back')}<ChevronRight /></Link>
        </div>
    )
}
