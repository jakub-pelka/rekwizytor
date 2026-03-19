'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, ArrowRight, Clock, Play, List } from 'lucide-react'
import { format, differenceInDays, isToday } from 'date-fns'
import { useLocale } from 'next-intl'
import { pl, enUS } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'

interface Performance {
    id: string
    title: string
    premiere_date: string | null
    next_show_date?: string | null
    image_url: string | null
    status: string
    progress?: {
        completed: number
        total: number
    }
}

interface NearestPerformanceCardProps {
    performance: Performance | null
}

export function NearestPerformanceCard({ performance }: NearestPerformanceCardProps) {
    const t = useTranslations('Dashboard')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS

    if (!performance) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-neutral-900/50 to-neutral-900/0 z-0" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="h-8 w-8 text-neutral-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">{t('noUpcomingPerformances')}</h3>
                    <Link href="/performances/new">
                        <Button variant="primary" size="lg" className="rounded-full shadow-lg shadow-action-primary/20">
                            {t('manageProduction')}
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Use next_show_date if available (for precise scheduling), otherwise fallback to premiere_date
    const displayDateString = performance.next_show_date || performance.premiere_date
    const displayDate = displayDateString ? new Date(displayDateString) : null
    const daysLeft = displayDate ? differenceInDays(displayDate, new Date()) : null
    const isPerformanceToday = displayDate ? isToday(displayDate) : false

    const progressPercentage = performance.progress
        ? Math.round((performance.progress.completed / performance.progress.total) * 100)
        : 0

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 min-h-[300px] flex flex-col justify-end shadow-2xl">
            {/* Blurred Background Layer */}
            {performance.image_url ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-80 transition-transform duration-700 group-hover:scale-125"
                        style={{ backgroundImage: `url(${performance.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                </>
            ) : (
                <div className="absolute inset-0 bg-linear-to-br from-neutral-800 to-neutral-950" />
            )}

            {/* Date in top right corner - no border/background as requested */}
            <div className="absolute top-6 right-8 z-20 flex items-center gap-2 text-neutral-300 text-sm md:text-base font-medium opacity-80">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                {displayDate ? format(displayDate, 'd MMMM yyyy', { locale: dateLocale }) : 'TBD'}
            </div>

            <div className="relative p-6 md:p-8 z-10 w-full h-full flex flex-col md:flex-row gap-6 md:gap-8 items-end md:items-center">

                {/* Foreground Poster (Miniature) */}
                {performance.image_url && (
                    <div className="hidden md:block shrink-0 w-32 h-48 relative rounded-lg overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500 rotate-0 group-hover:rotate-2">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${performance.image_url})` }}
                        />
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-end h-full">
                    <div className="flex items-start justify-between mb-4 md:mb-6">
                        {(() => {
                            let statusBadgeClass: string
                            if (isPerformanceToday) {
                                statusBadgeClass = 'bg-red-500/20 text-red-200 border-red-500/30'
                            } else if (performance.status === 'active') {
                                statusBadgeClass = 'bg-green-500/10 text-green-400 border-green-500/20'
                            } else {
                                statusBadgeClass = 'bg-white/10 text-white border-white/20'
                            }
                            return (
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-md border ${statusBadgeClass}`}>
                            {isPerformanceToday ? (
                                <>
                                    <Clock className="h-4 w-4" />
                                    <span className="animate-pulse">{t('today')}</span>
                                </>
                            ) : daysLeft !== null && daysLeft >= 0 ? (
                                <>
                                    <Clock className="h-4 w-4" />
                                    <span>{t('daysUntil', { days: daysLeft })}</span>
                                </>
                            ) : (
                                <>
                                    {performance.status === 'active' && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                    )}
                                    <span className="capitalize">{performance.status}</span>
                                </>
                            )}
                        </div>
                            )
                        })()}
                    </div>

                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg max-w-full md:max-w-2xl wrap-break-word break-all md:break-normal">
                        {performance.title}
                    </h2>

                    {/* Progress indicator for today's show */}
                    {isPerformanceToday && performance.progress && (
                        <div className="mb-6 max-w-md">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-neutral-300">
                                    {t('checklistProgress', {
                                        completed: performance.progress.completed,
                                        total: performance.progress.total
                                    })}
                                </span>
                                <span className="text-sm font-bold text-white">{progressPercentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                <div
                                    className="h-full bg-red-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-2 md:mt-4">
                        {isPerformanceToday ? (
                            <>
                                <Link href={`/performances/${performance.id}`}>
                                    <Button
                                        variant="glassy"
                                        className="rounded-full px-6"
                                        rightIcon={<ArrowRight className="h-4 w-4" />}
                                    >
                                        {t('manageProduction')}
                                    </Button>
                                </Link>
                                <Link href={`/performances/${performance.id}/live`}>
                                    <Button
                                        variant="glassy-danger"
                                        className="rounded-full px-8 font-bold"
                                        leftIcon={<List className="h-4 w-4 fill-current" />}
                                    >
                                        {t('viewLiveView')}
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <Link href={`/performances/${performance.id}`}>
                                <Button
                                    variant="glassy"
                                    className="rounded-full px-8 font-bold"
                                    rightIcon={<ArrowRight className="h-4 w-4" />}
                                >
                                    {t('manageProduction')}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
