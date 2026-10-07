'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { ArrowRight, Theater } from 'lucide-react'

interface RepertoirePerformance {
    id: string
    title: string
    image_url: string | null
    status: 'active' | 'upcoming' | 'archived'
    color: string | null
}

export function RepertoireStrip({ performances }: { performances: RepertoirePerformance[] }) {
    const t = useTranslations('Showcase')

    if (performances.length === 0) return null

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-red-900 rounded-full" />
                    {t('repertoire')}
                </h2>
                <Link href="/performances" className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors">
                    {t('seeAll')}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {performances.map(perf => (
                    <Link
                        key={perf.id}
                        href={`/performances/${perf.id}`}
                        className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
                        style={{ boxShadow: perf.color ? `0 0 0 1px ${perf.color}22` : undefined }}
                    >
                        {perf.image_url ? (
                            <Image
                                src={perf.image_url}
                                alt={perf.title}
                                fill
                                sizes="(min-width: 640px) 33vw, 50vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center" style={{ backgroundColor: perf.color ?? undefined }}>
                                <Theater className="h-10 w-10 text-white/40" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                            <span className="mb-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-200 backdrop-blur-sm">
                                {t(`status.${perf.status}`)}
                            </span>
                            <p className="font-semibold text-white leading-tight">{perf.title}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}
