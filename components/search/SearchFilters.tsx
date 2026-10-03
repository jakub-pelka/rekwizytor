'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, Tag, Filter, Check, ChevronDown, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'

export type FilterState = {
    status: string[]
    dateFrom?: string
    dateTo?: string
    location?: string
    category?: string
    groupId?: string
    sortBy: 'relevance' | 'date' | 'name'
}

type Props = {
    entityType: string | null
    filters: FilterState
    onChange: (filters: FilterState) => void
    className?: string
}

export function SearchFilters({ entityType, filters, onChange, className }: Props) {
    const t = useTranslations('Common')
    const tItems = useTranslations('ItemsList')
    const tPerf = useTranslations('Performances')

    // Status options based on entity type
    const getStatusOptions = () => {
        if (entityType === 'performance') {
            return [
                { value: 'active', label: tPerf('statuses.active') },
                { value: 'upcoming', label: tPerf('statuses.upcoming') },
                { value: 'archived', label: tPerf('statuses.archived') }
            ]
        }
        return []
    }

    const statusOptions = getStatusOptions()

    const updateFilter = (key: keyof FilterState, value: any) => {
        onChange({ ...filters, [key]: value })
    }

    const toggleStatus = (value: string) => {
        const current = filters.status
        const next = current.includes(value)
            ? current.filter(s => s !== value)
            : [...current, value]
        updateFilter('status', next)
    }

    return (
        <div className={clsx("flex flex-wrap items-center gap-2 text-sm", className)}>

            {/* Status Filter - Only show if options exist */}
            {statusOptions.length > 0 && (
                <div className="relative group z-20">
                    <button className={clsx(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                        filters.status.length > 0
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                    )}>
                        <Filter className="h-3.5 w-3.5" />
                        <span>
                            {filters.status.length > 0
                                ? `${filters.status.length} selected`
                                : 'Status'}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>

                    {/* Dropdown with Safe Hover Bridge */}
                    <div className="absolute top-full left-0 pt-2 hidden group-hover:block w-48 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                            {statusOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleStatus(opt.value)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-800 transition-colors text-neutral-300"
                                >
                                    <span>{opt.label}</span>
                                    {filters.status.includes(opt.value) && <Check className="h-3 w-3 text-emerald-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Date Filters (Productions, Notes) */}
            {(entityType === 'performance' || entityType === 'note') && (
                <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-lg px-2 py-2.5">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    <input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                        className="bg-transparent border-none text-xs text-neutral-300 focus:ring-0 p-0 w-24 placeholder-neutral-600"
                        placeholder="From"
                    />
                    <span className="text-neutral-600">-</span>
                    <input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                        className="bg-transparent border-none text-xs text-neutral-300 focus:ring-0 p-0 w-24"
                        placeholder="To"
                    />
                </div>
            )}

            {/* Location Filter (Performance, Item, Group, Location itself doesn't need location filter?) */}
            {['performance', 'group'].includes(entityType || '') && (
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                    filters.location ? "bg-orange-500/10 border-orange-500/30 text-orange-300" : "bg-neutral-900/50 border-neutral-800 text-neutral-400"
                )}>
                    <MapPin className="h-3.5 w-3.5" />
                    <input
                        type="text"
                        value={filters.location || ''}
                        onChange={(e) => updateFilter('location', e.target.value)}
                        placeholder="Location..."
                        className="bg-transparent border-none text-sm focus:ring-0 p-0 w-24 placeholder-neutral-500"
                    />
                    {filters.location && (
                        <button onClick={() => updateFilter('location', '')} className="hover:text-white">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Category / Group Filter (Item, Note) */}
            {['note'].includes(entityType || '') && (
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                    filters.category ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-neutral-900/50 border-neutral-800 text-neutral-400"
                )}>
                    <Tag className="h-3.5 w-3.5" />
                    <input
                        type="text"
                        value={filters.category || ''}
                        onChange={(e) => updateFilter('category', e.target.value)}
                        placeholder={entityType === 'item' ? "Category..." : "Tag..."}
                        className="bg-transparent border-none text-sm focus:ring-0 p-0 w-24 placeholder-neutral-500"
                    />
                    {filters.category && (
                        <button onClick={() => updateFilter('category', '')} className="hover:text-white">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Reset All */}
            {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v) && (
                <button
                    onClick={() => onChange({ status: [], sortBy: filters.sortBy })} // Keep sort
                    className="text-xs text-neutral-500 hover:text-white transition-colors ml-auto"
                >
                    {t('clearFilters')}
                </button>
            )}
        </div>
    )
}
