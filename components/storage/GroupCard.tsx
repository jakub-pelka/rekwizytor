'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, Layers, Plus, QrCode } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/client'
import { notify } from '@/utils/notify'
import { MobileTop } from '@/components/rk/MobileTop'
import { RkIcon } from '@/components/rk/RkIcon'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { GROUP_STATUS } from '@/components/rk/GroupStatus'
import type { StorageGroup, StorageLocation } from '@/lib/storage'
import type { GroupStatus } from '@/lib/performance-structure'

export type GroupUsage = { propId: string; performanceId: string; title: string; name: string; code: string; itemId: string | null }

type Props = { group: StorageGroup; path: StorageLocation[]; usage: GroupUsage[]; canEdit: boolean }

const STATUSES: GroupStatus[] = ['available', 'in_repair', 'loaned', 'missing']

// Karta grupy przedmiotów (karta Magazyn, ekran „Karta-telefon”): opis zbiorczy, rozpisane przedmioty, spektakle.
export function GroupCard({ group, path, usage, canEdit }: Props) {
    const t = useTranslations('GroupCard')
    const ts = useTranslations('Storage')
    const router = useRouter()
    const [adding, setAdding] = useState(false)
    const [name, setName] = useState('')
    const parent = path[path.length - 1]
    const room = path[0]
    const highlight = useSearchParams().get('highlight')

    // Deep link ?highlight= z kodu QR na etykiecie przedmiotu: przewinięcie i mignięcie obwódką (2 px, kolor focus).
    useEffect(() => {
        if (!highlight) return
        const el = document.querySelector<HTMLElement>(`[data-hl="${CSS.escape(highlight)}"]`)
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        el.style.outline = '2px solid var(--focus)'
        el.style.outlineOffset = '2px'
        const id = setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = '' }, 2400)
        return () => { clearTimeout(id); el.style.outline = ''; el.style.outlineOffset = '' }
    }, [highlight])

    const addItem = async () => {
        if (!name.trim()) { setAdding(false); return }
        const { error } = await createClient().from('group_items').insert({ group_id: group.id, name: name.trim() })
        if (error) { notify.error(ts('itemFailed')); return }
        setName('')
        setAdding(false)
        router.refresh()
    }

    const setStatus = async (status: GroupStatus, itemId?: string) => {
        const supabase = createClient()
        const { error } = itemId
            ? await supabase.from('group_items').update({ status }).eq('id', itemId)
            : await supabase.from('groups').update({ status }).eq('id', group.id)
        if (error) { notify.error(t('statusFailed')); return }
        router.refresh()
    }

    const itemPerformances = (itemId: string) =>
        [...new Set(usage.filter(u => u.itemId === itemId || (!u.itemId && u.name === group.items.find(i => i.id === itemId)?.name)).map(u => u.title))]

    return (
        <div>
            <MobileTop
                back={parent ? { href: `/groups?room=${room.id}`, label: parent.name } : { href: '/groups', label: ts('storage') }}
                title={group.name}
                anchorId="group-title"
                actions={<>
                    <Link href="/settings/qr-codes" className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('printLabel')}><QrCode /></Link>
                    {canEdit && (
                        <ActionMenu
                            label={t('actions', { name: group.name })}
                            items={STATUSES.map(s => ({
                                type: 'button' as const,
                                label: t('markAs', { status: s === 'available' ? ts('inPlace') : GROUP_STATUS[s].label }),
                                onSelect: () => setStatus(s),
                            }))}
                        />
                    )}
                </>}
            />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-2 pb-8 md:pt-8">
                <nav className="rk-inv-crumbs hidden md:flex" aria-label={ts('crumbs')}>
                    <Link className="rk-inv-crumb" href="/groups">{ts('storage')}</Link>
                    {path.map(l => (
                        <span key={l.id} className="contents">
                            <span><ChevronRight /></span>
                            <Link className="rk-inv-crumb" href={`/groups?room=${room.id}`}>{l.name}</Link>
                        </span>
                    ))}
                </nav>

                <div className="rk-ai__photo grid h-[200px] flex-none place-items-center text-ink-subtle [&>svg]:!h-12 [&>svg]:!w-12">
                    <Layers />
                </div>

                <div className="flex flex-col gap-2">
                    <span className="rk-tally">{[group.code, path.map(l => l.name).join(', ') || ts('unassigned')].filter(Boolean).join(' · ')}</span>
                    <h1 className="rk-page-header__title" id="group-title">{group.name}</h1>
                    {group.description && <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{group.description}</p>}
                </div>

                <section className="pl-sect" aria-labelledby="gc-items">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <h2 className="pl-h2" id="gc-items">{t('items')}</h2>
                        <span className="rk-tally">
                            {group.approxCount != null ? t('itemsOfApprox', { n: group.items.length, approx: group.approxCount }) : group.items.length}
                        </span>
                    </div>
                    {group.items.length > 0 && (
                        <ul className="pl-list rk-inv-list">
                            {group.items.map(i => (
                                <li key={i.id} className="relative" data-hl={i.id}>
                                    <span className="rk-inv-row rk-inv-row--item">
                                        <span className="rk-inv-ico"><RkIcon name="metka" /></span>
                                        <span className="rk-inv-text">
                                            <b>{i.name}</b>
                                            <small>
                                                {i.code && <span className="rk-id">{i.code}</span>}
                                                {itemPerformances(i.id).length > 0 && <span>{`· ${itemPerformances(i.id).join(', ')}`}</span>}
                                            </small>
                                        </span>
                                        {canEdit ? (
                                            <span className="rk-select">
                                                <select
                                                    aria-label={t('statusOf', { name: i.name })}
                                                    value={i.status}
                                                    onChange={e => setStatus(e.target.value as GroupStatus, i.id)}
                                                    className="!h-8 !text-[13px]"
                                                >
                                                    {STATUSES.map(s => <option key={s} value={s}>{s === 'available' ? ts('inPlace') : GROUP_STATUS[s].label}</option>)}
                                                </select>
                                            </span>
                                        ) : (
                                            <span className={`rk-badge rk-badge--${i.status === 'available' ? 'success' : GROUP_STATUS[i.status].tone}`}>
                                                {i.status === 'available' ? ts('inPlace') : GROUP_STATUS[i.status].label}
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {canEdit && (adding ? (
                        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void addItem() }}>
                            <input className="rk-input flex-1" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={ts('itemPlaceholder')} aria-label={ts('itemPlaceholder')} />
                            <button type="submit" className="rk-btn rk-btn--secondary rk-btn--sm">{ts('itemAdd')}</button>
                        </form>
                    ) : (
                        <button type="button" className="rk-btn rk-btn--secondary w-full" onClick={() => setAdding(true)}><Plus />{t('itemize')}</button>
                    ))}
                    <p className="pl-meta m-0">{t('itemizeHint')}</p>
                </section>

                <section className="pl-sect" aria-labelledby="gc-shows">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <h2 className="pl-h2" id="gc-shows">{t('inShows')}</h2>
                        <span className="rk-tally">{usage.length}</span>
                    </div>
                    {usage.length > 0 ? (
                        <ul className="pl-list sp-scenes">
                            {usage.map(u => (
                                <li key={u.propId}>
                                    <Link className="sp-scene" href={`/performances/${u.performanceId}`}>
                                        <span className="sp-scene__n">{u.code}</span>
                                        <span className="sp-scene__name">{`${u.title} · ${u.name}`}</span>
                                        <ChevronRight />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="pl-meta">{t('notInShows')}</p>}
                </section>
            </div>
        </div>
    )
}
