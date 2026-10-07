'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Box, Camera, Layers, ListChecks, MapPin, NotebookPen, ScanLine, Search, Sparkles } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { RkIcon } from '@/components/rk/RkIcon'
import { unifiedSearch, type SearchResult } from '@/app/actions/unified-search'
import type { SearchContext } from './GlobalSearchDialog'

type Entry = { key: string; label: string; hint?: string; icon: ReactNode; href: string; kbd?: string }

const TYPE_ORDER: SearchResult['entity_type'][] = ['group', 'item', 'performance', 'location', 'note']

/** Adres wyniku w nowych ekranach (widok wyszukiwania zwraca jeszcze stare adresy). */
function hrefFor(r: SearchResult) {
    switch (r.entity_type) {
        case 'group': return `/groups/${r.id}`
        case 'performance': return `/performances/${r.id}`
        case 'note': return `/notes/${r.id}`
        case 'location': return `/groups?room=${r.id}`
        default: return r.url
    }
}

// Paleta poleceń (karta CommandPalette, .rk-cmd): ⌘K albo „Przejdź do…”. Najpierw akcje i miejsca,
// potem wyniki z całej aplikacji. Strzałki, Enter, Esc.
export function CommandPalette({ isOpen, onClose, initialContext }: { isOpen: boolean; onClose: () => void; initialContext?: SearchContext }) {
    const t = useTranslations('Palette')
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState(0)
    const input = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!isOpen) { setQuery(''); setResults([]); setSelected(0); return }
        setTimeout(() => input.current?.focus(), 0)
    }, [isOpen])

    useEffect(() => {
        const q = query.trim()
        if (!q) { setResults([]); return }
        setLoading(true)
        const id = setTimeout(async () => {
            const response = await unifiedSearch(q, { matchCount: 20, entityTypeFilter: initialContext ? [initialContext] : undefined })
            // Wyszukiwanie łączy kilka metod dopasowania, więc ta sama rzecz może przyjść dwa razy.
            const seen = new Set<string>()
            setResults((response.results ?? []).filter(r => !seen.has(`${r.entity_type}:${r.id}`) && !!seen.add(`${r.entity_type}:${r.id}`)))
            setLoading(false)
            setSelected(0)
        }, 200)
        return () => clearTimeout(id)
    }, [query, initialContext])

    const actions: Entry[] = useMemo(() => [
        { key: 'scan', label: t('addFromPhoto'), icon: <Camera />, href: '/scan' },
        { key: 'label', label: t('scanLabel'), icon: <ScanLine />, href: '/scan/label' },
        { key: 'home', label: t('goHome'), icon: <RkIcon name="scena-wykres" />, href: '/' },
        { key: 'shows', label: t('goShows'), icon: <RkIcon name="scena-kotary" />, href: '/performances' },
        { key: 'lists', label: t('goLists'), icon: <ListChecks />, href: '/lists' },
        { key: 'storage', label: t('goStorage'), icon: <RkIcon name="metka" />, href: '/groups' },
        { key: 'notes', label: t('goNotes'), icon: <NotebookPen />, href: '/notes' },
    ], [t])

    const icon = (type: SearchResult['entity_type']) => ({
        group: <Layers />, item: <RkIcon name="metka" />, performance: <RkIcon name="scena-kotary" />, location: <Box />, note: <NotebookPen />,
    }[type] ?? <MapPin />)

    const q = query.trim().toLocaleLowerCase('pl')
    const sections: { title: string; entries: Entry[] }[] = q
        ? [
            ...TYPE_ORDER.map(type => ({
                title: t(`type.${type}`),
                entries: results.filter(r => r.entity_type === type).map(r => ({
                    key: `${type}:${r.id}`, label: r.name, hint: r.description ?? undefined, icon: icon(type), href: hrefFor(r),
                })),
            })).filter(s => s.entries.length),
            { title: t('actions'), entries: actions.filter(a => a.label.toLocaleLowerCase('pl').includes(q)) },
        ].filter(s => s.entries.length)
        : [{ title: t('actions'), entries: actions }]

    const flat = sections.flatMap(s => s.entries)
    const go = (e: Entry | undefined) => { if (!e) return; onClose(); router.push(e.href) }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(flat.length - 1, s + 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(0, s - 1)) }
        if (e.key === 'Enter') { e.preventDefault(); go(flat[selected]) }
        if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }

    const highlight = (text: string) => {
        const i = q ? text.toLocaleLowerCase('pl').indexOf(q) : -1
        if (i < 0) return text
        return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
    }

    if (!isOpen) return null
    let index = -1

    return (
        <div className="rk-overlay fixed inset-0 z-[80] items-start rounded-none pt-[12vh] max-md:!p-0" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="rk-cmd max-md:h-full max-md:max-w-none max-md:rounded-none" role="dialog" aria-modal="true" aria-label={t('title')} onKeyDown={onKeyDown}>
                <div className="rk-cmd__input">
                    <Search />
                    <input
                        ref={input}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('placeholder')}
                        aria-label={t('placeholder')}
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="rk-cmd-list"
                        aria-activedescendant={flat[selected] ? `cmd-${flat[selected].key}` : undefined}
                    />
                    <kbd>Esc</kbd>
                </div>
                <div className="rk-cmd__list" id="rk-cmd-list" role="listbox">
                    {sections.map(s => (
                        <div key={s.title} role="group" aria-label={s.title}>
                            <div className="rk-cmd__group">{s.title}</div>
                            {s.entries.map(e => {
                                index++
                                const i = index
                                return (
                                    <div
                                        key={e.key}
                                        id={`cmd-${e.key}`}
                                        role="option"
                                        aria-selected={i === selected}
                                        className="rk-cmd__item cursor-pointer"
                                        onMouseEnter={() => setSelected(i)}
                                        onClick={() => go(e)}
                                    >
                                        {e.icon}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">{highlight(e.label)}</span>
                                            {e.hint && <small className="truncate">{e.hint}</small>}
                                        </span>
                                        {e.kbd && <kbd>{e.kbd}</kbd>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                    {q && !loading && flat.length === 0 && (
                        <div className="rk-empty rk-empty--compact">
                            <span className="rk-empty__text">{t('noResults', { query: query.trim() })}</span>
                        </div>
                    )}
                </div>
                <div className="rk-cmd__ai"><Sparkles /><span><b>{t('aiHintTitle')}</b> {t('aiHint')}</span></div>
                <div className="rk-cmd__foot">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> {t('footMove')}</span>
                    <span><kbd>↵</kbd> {t('footOpen')}</span>
                    <span><kbd>Esc</kbd> {t('footClose')}</span>
                </div>
            </div>
        </div>
    )
}
