'use client'

import { useState, useEffect } from 'react'
import { Layers, Calendar, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Database } from '@/types/supabase'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { FilterBar } from '@/components/ui/FilterBar'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

type Performance = Pick<Database['public']['Tables']['performances']['Row'],
    'id' | 'title' | 'status' | 'premiere_date' | 'thumbnail_url' | 'image_url' | 'color'>

type Props = {
    performances: Performance[]
}

// Tiny blur placeholder for faster image loading (LCP optimization)
const BLUR_PLACEHOLDER = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAADAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB/9k="

const PerformanceListItem = ({ show, index }: { show: Performance; index: number }) => {
    const t = useTranslations('PerformancesList')
    const tStatus = useTranslations('PerformancesList.statuses')

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative"
        >
            <Link
                href={`/performances/${show.id}`}
                className="flex items-center gap-4 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800 rounded-xl p-3 transition-all duration-300 hover:bg-neutral-900/60 hover:border-(--hover-border)! group-hover:scale-[1.01]"
                style={{
                    boxShadow: show.color ? `inset 4px 0 0 ${show.color}` : 'none',
                    '--hover-border': show.color
                        ? `color-mix(in srgb, ${show.color}, black 30%)`
                        : 'rgba(255, 255, 255, 0.1)'
                } as React.CSSProperties}
            >
                {/* Thumbnail */}
                <div className="relative h-24 w-16 shrink-0 rounded-lg overflow-hidden bg-neutral-800 shadow-inner">
                    {show.thumbnail_url ? (
                        <Image
                            src={show.thumbnail_url}
                            alt={show.title}
                            fill
                            priority={index < 4}
                            placeholder="blur"
                            blurDataURL={BLUR_PLACEHOLDER}
                            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-700 bg-neutral-800/50">
                            <Layers className="w-6 h-6 text-neutral-600" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                    <div>
                        <h3 className="text-base font-bold text-white truncate group-hover:text-purple-200 transition-colors">
                            {show.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={clsx(
                                "px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border",
                                show.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    show.status === 'upcoming' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        'bg-neutral-800 text-neutral-400 border-neutral-700'
                            )}>
                                {tStatus(show.status as Database['public']['Enums']['performance_status_enum'])}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <span>{show.premiere_date ? format(new Date(show.premiere_date), 'dd/MM/yyyy') : t('tbd')}</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-neutral-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </Link>
        </motion.div>
    )
}

const PerformanceGridItem = ({ show, index }: { show: Performance; index: number }) => {
    const t = useTranslations('PerformancesList')
    const tStatus = useTranslations('PerformancesList.statuses')

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative h-[320px]"
        >
            <Link
                href={`/performances/${show.id}`}
                className="block w-full h-full relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm transition-all duration-300 group-hover:border-(--hover-border)! group-hover:scale-[1.02] shadow-2xl"
                style={{
                    '--hover-border': show.color
                        ? `color-mix(in srgb, ${show.color}, black 30%)`
                        : 'rgba(255, 255, 255, 0.1)'
                } as React.CSSProperties}
            >
                {/* Poster Image Background */}
                <div className="absolute inset-0 z-0 bg-neutral-900">
                    <div className="relative w-full h-full">
                        {show.image_url ? (
                            <>
                                {/* Blurred background for "bars" effect fix */}
                                <Image
                                    src={show.image_url}
                                    alt={show.title}
                                    fill
                                    className="object-cover blur-2xl opacity-50 scale-125"
                                />
                                {/* Main Image */}
                                <Image
                                    src={show.image_url}
                                    alt={show.title}
                                    fill
                                    priority={index < 4}
                                    placeholder="blur"
                                    blurDataURL={BLUR_PLACEHOLDER}
                                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-700">
                                <Layers className="w-16 h-16 opacity-20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                    </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 z-10 flex flex-col justify-end h-full">
                    {/* Status Badge */}
                    <div className="mb-auto pt-2">
                        <span className={clsx(
                            "px-3 py-1 rounded-lg backdrop-blur-md text-xs font-bold uppercase tracking-wider border shadow-lg",
                            show.status === 'active' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' :
                                show.status === 'upcoming' ? 'bg-yellow-950/50 text-yellow-400 border-yellow-500/30' :
                                    'bg-neutral-900/80 text-neutral-400 border-neutral-700'
                        )}>
                            {tStatus(show.status as Database['public']['Enums']['performance_status_enum'])}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-white leading-tight group-hover:text-purple-200 transition-colors line-clamp-2">
                            {show.title}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-neutral-300 font-medium">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            {show.premiere_date ? format(new Date(show.premiere_date), 'MMMM d, yyyy') : t('tbd')}
                        </div>

                        {/* Color Strip Indicator */}
                        {show.color && (
                            <div className="h-1 w-full rounded-full mt-4 opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: show.color }} />
                        )}
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

export function PerformancesList({ performances }: Props) {
    const t = useTranslations('PerformancesList')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

    useEffect(() => {
        const savedViewMode = localStorage.getItem('performances_view_mode') as 'list' | 'grid'
        if (savedViewMode) {
            setViewMode(savedViewMode)
        }
    }, [])

    const handleViewModeChange = (mode: 'list' | 'grid') => {
        setViewMode(mode)
        localStorage.setItem('performances_view_mode', mode)
    }

    const filteredPerformances = performances

    return (
        <div className="space-y-8">
            {/* Filter Bar */}
            <FilterBar>
                <div className="flex-1 min-w-[200px]">
                    <MorphingSearchBar mode="trigger" context="performance" className="w-full" />
                </div>

                <div className="shrink-0">
                    <ViewToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
                </div>
            </FilterBar>

            {/* Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        {filteredPerformances.map((show, index) => (
                            <PerformanceListItem key={show.id} show={show} index={index} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredPerformances.map((show, index) => (
                            <PerformanceGridItem key={show.id} show={show} index={index} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {filteredPerformances.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900 mb-4">
                        <Layers className="w-8 h-8 text-neutral-600" />
                    </div>
                    <p className="text-xl font-bold text-neutral-500">{t('noPerformancesFound')}</p>
                    <p className="text-neutral-600 mt-2">{t('noPerformancesHint')}</p>
                </div>
            )}
        </div>
    )
}
