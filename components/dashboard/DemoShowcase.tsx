'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { LogIn, ArrowRight, ScanLine, Layers, ClipboardCheck, QrCode, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Landing section shown to visitors browsing without an account (read-only demo).
export function DemoShowcase() {
    const t = useTranslations('Showcase')

    const features = [
        { key: 'ai', icon: ScanLine, href: '/performances', accent: 'text-burgundy-light bg-burgundy-main/15 border-burgundy-light/20' },
        { key: 'performances', icon: Layers, href: '/performances', accent: 'text-purple-300 bg-purple-500/10 border-purple-400/20' },
        { key: 'live', icon: ClipboardCheck, href: '/checklists', accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20' },
        { key: 'labels', icon: QrCode, href: '/groups', accent: 'text-amber-300 bg-amber-500/10 border-amber-400/20' },
    ] as const

    return (
        <section className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-burgundy-extra-dark via-neutral-950 to-neutral-950 p-6 sm:p-10">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-burgundy-main/25 blur-3xl" />
                <div className="relative max-w-2xl space-y-5">
                    <p className="font-courier text-xs uppercase tracking-[0.2em] text-burgundy-light">{t('eyebrow')}</p>
                    <h1 className="text-3xl sm:text-4xl text-white leading-tight">{t('title')}</h1>
                    <p className="text-base sm:text-lg text-neutral-300">{t('lead')}</p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link href="/login">
                            <Button variant="primary" size="lg" className="w-full sm:w-auto rounded-xl">
                                <LogIn className="h-4 w-4 mr-2" />
                                {t('ctaLogin')}
                            </Button>
                        </Link>
                        <Link href="/performances">
                            <Button variant="glassy" size="lg" className="w-full sm:w-auto">
                                {t('ctaExplore')}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-neutral-500">
                        <Eye className="h-3.5 w-3.5" />
                        {t('previewNote')}
                    </p>
                </div>
            </div>

            <div>
                <h2 className="sr-only">{t('featuresTitle')}</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {features.map(({ key, icon: Icon, href, accent }) => (
                        <Link
                            key={key}
                            href={href}
                            className="group flex gap-4 sm:block rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-5 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                        >
                            <span className={`sm:mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accent}`}>
                                <Icon className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-1">
                                    {t(`features.${key}.title`)}
                                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                                </h3>
                                <p className="text-sm text-neutral-400 leading-relaxed">{t(`features.${key}.desc`)}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
