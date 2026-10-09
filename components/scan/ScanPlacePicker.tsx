'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    Archive,
    Check,
    ChevronDown,
    Layers3,
    MapPin,
    Package,
    Search,
    Warehouse,
} from 'lucide-react'

export type PlaceNode = {
    id: string
    name: string
    parentId: string | null
    depth: number          // 0 = pomieszczenie
    path: string[]         // nazwy od pomieszczenia do tego miejsca, razem z nim
    childCount: number     // liczba bezpośrednich dzieci
}

type Props = {
    nodes: PlaceNode[]      // już posortowane w kolejności drzewa (rodzic przed dziećmi)
    value: string           // id wybranego miejsca albo '' (Nieprzypisane)
    onChange: (id: string) => void
    recent: string[]        // id ostatnio używanych miejsc, najnowsze pierwsze, już przefiltrowane do istniejących
    disabled?: boolean
}

function getNodeIcon(depth: number) {
    if (depth === 0) return Warehouse
    if (depth === 1) return Archive
    if (depth === 2) return Package
    return Layers3
}

function normalizeText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[łŁ]/g, m => (m === 'ł' ? 'l' : 'L'))
        .toLowerCase()
}

export function ScanPlacePicker({ nodes, value, onChange, recent, disabled }: Props) {
    const t = useTranslations('Scan')
    const [rawOpen, setRawOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [hoverIndex, setHoverIndex] = useState(-1)

    const isOpen = rawOpen && !disabled

    const containerRef = useRef<HTMLDivElement>(null)
    const destButtonRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
    const selectedNode = nodeMap.get(value)

    const recentNodes = useMemo(() => {
        const seen = new Set<string>()
        const list: PlaceNode[] = []
        for (const id of recent) {
            if (seen.has(id)) continue
            seen.add(id)
            const node = nodeMap.get(id)
            if (node) {
                list.push(node)
                if (list.length === 2) break
            }
        }
        return list
    }, [recent, nodeMap])

    const isSearching = search.trim().length > 0

    const filteredNodes = useMemo(() => {
        if (!isSearching) return []
        const query = normalizeText(search.trim())
        const tokens = query.split(/[\s›>]+/).filter(Boolean)
        return nodes.filter(node => {
            const fullPath = normalizeText(node.path.join(' › '))
            return tokens.every(tok => fullPath.includes(tok))
        })
    }, [isSearching, nodes, search])

    const visibleItems = useMemo<{ id: string }[]>(() => {
        if (isSearching) {
            return filteredNodes.map(node => ({ id: node.id }))
        }
        return [
            ...recentNodes.map(node => ({ id: node.id })),
            ...nodes.map(node => ({ id: node.id })),
            { id: '' },
        ]
    }, [isSearching, filteredNodes, recentNodes, nodes])

    const unassignedIndex = recentNodes.length + nodes.length

    // Po otwarciu fokus w polu szukania
    useEffect(() => {
        if (isOpen) {
            searchInputRef.current?.focus()
        }
    }, [isOpen])

    // Przewiń widok do podświetlonego wiersza
    useEffect(() => {
        if (hoverIndex >= 0 && itemRefs.current[hoverIndex]) {
            itemRefs.current[hoverIndex]?.scrollIntoView?.({ block: 'nearest' })
        }
    }, [hoverIndex])

    // Klik poza komponentem zamyka
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setRawOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const handleToggle = () => {
        if (disabled) return
        if (isOpen) {
            setRawOpen(false)
        } else {
            setSearch('')
            setHoverIndex(-1)
            setRawOpen(true)
        }
    }

    const handleClose = () => {
        setRawOpen(false)
        destButtonRef.current?.focus()
    }

    const handleSelect = (id: string) => {
        onChange(id)
        setRawOpen(false)
        destButtonRef.current?.focus()
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setSearch(val)
        setHoverIndex(val.trim().length > 0 ? 0 : -1)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            handleClose()
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (visibleItems.length === 0) return
            setHoverIndex(prev => {
                if (prev < 0) return 0
                return (prev + 1) % visibleItems.length
            })
            return
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (visibleItems.length === 0) return
            setHoverIndex(prev => {
                if (prev < 0) return visibleItems.length - 1
                return (prev - 1 + visibleItems.length) % visibleItems.length
            })
            return
        }

        if (e.key === 'Enter') {
            e.preventDefault()
            if (visibleItems.length === 0) return
            const targetIndex = hoverIndex >= 0 ? hoverIndex : 0
            const item = visibleItems[targetIndex]
            if (item) {
                handleSelect(item.id)
            }
            return
        }
    }

    const destParents = selectedNode ? selectedNode.path.slice(0, -1) : []
    const destLeaf = selectedNode
        ? (selectedNode.path[selectedNode.path.length - 1] ?? selectedNode.name)
        : ''

    return (
        <div className="sk-foot-anchor" style={{ position: 'relative' }} ref={containerRef}>
            {isOpen && (
                <div
                    className="sk-pick"
                    role="dialog"
                    aria-label={t('saveIn')}
                    onKeyDown={handleKeyDown}
                >
                    <div className="sk-pick__search">
                        <label className="rk-find">
                            <Search />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder={t('placeSearch')}
                                aria-label={t('placeSearch')}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </label>
                    </div>
                    <div className="sk-pick__body" role="listbox" aria-label={t('saveIn')}>
                        {isSearching ? (
                            <div className="sk-pick__sec">
                                {filteredNodes.length > 0 ? (
                                    filteredNodes.map((node, idx) => {
                                        const itemIndex = idx
                                        const isSel = node.id === value
                                        const isHov = hoverIndex === itemIndex
                                        const parents = node.path.slice(0, -1)
                                        const Icon = getNodeIcon(node.depth)
                                        return (
                                            <button
                                                key={`search-${node.id}`}
                                                ref={el => {
                                                    itemRefs.current[itemIndex] = el
                                                }}
                                                type="button"
                                                role="option"
                                                aria-selected={isSel}
                                                className={`sk-node ${node.depth === 0 ? 'is-room' : ''} ${isSel ? 'is-sel' : ''} ${isHov ? 'is-hover' : ''}`.trim()}
                                                style={{ paddingLeft: '8px' }}
                                                onClick={() => handleSelect(node.id)}
                                                onMouseEnter={() => setHoverIndex(itemIndex)}
                                            >
                                                <Icon />
                                                <span>
                                                    {parents.length > 0 && <em>{parents.join(' › ')} › </em>}
                                                    {node.name}
                                                </span>
                                                {isSel && <Check className="ok" />}
                                            </button>
                                        )
                                    })
                                ) : (
                                    <span className="rk-tally">{t('placeNone')}</span>
                                )}
                            </div>
                        ) : (
                            <>
                                {recentNodes.length > 0 && (
                                    <div className="sk-pick__sec">
                                        <span className="rk-tally">{t('placeRecent')}</span>
                                        {recentNodes.map((node, idx) => {
                                            const itemIndex = idx
                                            const isSel = node.id === value
                                            const isHov = hoverIndex === itemIndex
                                            const parents = node.path.slice(0, -1)
                                            const Icon = getNodeIcon(node.depth)
                                            return (
                                                <button
                                                    key={`recent-${node.id}`}
                                                    ref={el => {
                                                        itemRefs.current[itemIndex] = el
                                                    }}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSel}
                                                    className={`sk-node ${node.depth === 0 ? 'is-room' : ''} ${isSel ? 'is-sel' : ''} ${isHov ? 'is-hover' : ''}`.trim()}
                                                    style={{ paddingLeft: '8px' }}
                                                    onClick={() => handleSelect(node.id)}
                                                    onMouseEnter={() => setHoverIndex(itemIndex)}
                                                >
                                                    <Icon />
                                                    <span>
                                                        {parents.length > 0 && <em>{parents.join(' › ')} › </em>}
                                                        {node.name}
                                                    </span>
                                                    {isSel && <Check className="ok" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                                <div className="sk-pick__sec">
                                    <span className="rk-tally">{t('placeAll')}</span>
                                    {nodes.map((node, idx) => {
                                        const itemIndex = recentNodes.length + idx
                                        const isSel = node.id === value
                                        const isHov = hoverIndex === itemIndex
                                        const Icon = getNodeIcon(node.depth)
                                        const hasChildren = node.childCount > 0
                                        return (
                                            <button
                                                key={`node-${node.id}`}
                                                ref={el => {
                                                    itemRefs.current[itemIndex] = el
                                                }}
                                                type="button"
                                                role="option"
                                                aria-selected={isSel}
                                                className={`sk-node ${node.depth === 0 ? 'is-room' : ''} ${isSel ? 'is-sel' : ''} ${isHov ? 'is-hover' : ''}`.trim()}
                                                style={{ paddingLeft: `${8 + 20 * node.depth}px` }}
                                                onClick={() => handleSelect(node.id)}
                                                onMouseEnter={() => setHoverIndex(itemIndex)}
                                            >
                                                {hasChildren ? <ChevronDown className="tw" /> : <span className="sp" />}
                                                <Icon />
                                                <span>{node.name}</span>
                                                {isSel ? (
                                                    <Check className="ok" />
                                                ) : hasChildren ? (
                                                    <small>{node.childCount}</small>
                                                ) : null}
                                            </button>
                                        )
                                    })}
                                    <button
                                        ref={el => {
                                            itemRefs.current[unassignedIndex] = el
                                        }}
                                        type="button"
                                        role="option"
                                        aria-selected={value === ''}
                                        className={`sk-node is-ghost ${value === '' ? 'is-sel' : ''} ${hoverIndex === unassignedIndex ? 'is-hover' : ''}`.trim()}
                                        style={{ paddingLeft: '8px' }}
                                        onClick={() => handleSelect('')}
                                        onMouseEnter={() => setHoverIndex(unassignedIndex)}
                                    >
                                        <span className="sp" />
                                        <Package />
                                        <span>{t('unassigned')}</span>
                                        {value === '' && <Check className="ok" />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <button
                ref={destButtonRef}
                type="button"
                className="sk-dest"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={handleToggle}
                onKeyDown={e => {
                    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        e.preventDefault()
                        handleToggle()
                    }
                }}
            >
                <MapPin />
                <span className="sk-dest__txt">
                    <small>{t('saveIn')}</small>
                    <b>
                        {selectedNode ? (
                            destParents.length > 0 ? (
                                <>
                                    {destParents.map((parent, idx) => (
                                        <Fragment key={idx}>
                                            <em>{parent}</em>
                                            {' › '}
                                        </Fragment>
                                    ))}
                                    {destLeaf}
                                </>
                            ) : (
                                destLeaf
                            )
                        ) : (
                            t('unassigned')
                        )}
                    </b>
                </span>
                <ChevronDown />
            </button>
        </div>
    )
}
