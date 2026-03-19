'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { ArrowLeft, Info, FileText, Shield, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import packageJson from '@/package.json'

export default function AboutPage() {
    const t = useTranslations('About')
    const [isLicenseOpen, setIsLicenseOpen] = useState(false)

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-12">
                {/* Header */}
                <div className="space-y-6">
                    <Link
                        href="/settings"
                        className="inline-flex items-center text-neutral-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('backToSettings')}
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                            <Info className="w-8 h-8 text-neutral-200" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{t('title')}</h1>
                            <p className="text-neutral-400 mt-1">{t('subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Test Version Warning */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200/80">
                        {t('testVersionWarning')}
                    </p>
                </div>

                {/* App Info */}
                <div className="grid gap-6">
                    <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            {t('appInfo')}
                        </h2>
                        <div className="space-y-2 text-sm text-neutral-400">
                            <div className="flex justify-between py-2 border-b border-neutral-800">
                                <span>{t('version')}</span>
                                <span className="font-mono text-white">{packageJson.version}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-neutral-800">
                                <span>{t('buildDate')}</span>
                                <span className="text-white">{format(new Date(), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span>{t('environment')}</span>
                                <span className="text-white capitalize">{process.env.NODE_ENV}</span>
                            </div>
                        </div>
                    </div>

                    {/* License */}
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setIsLicenseOpen(!isLicenseOpen)}
                            className="w-full p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
                        >
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-400" />
                                {t('license')}
                            </h2>
                            {isLicenseOpen ? (
                                <ChevronUp className="w-5 h-5 text-neutral-500" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-neutral-500" />
                            )}
                        </button>

                        {isLicenseOpen && (
                            <div className="px-6 pb-6 pt-0">
                                <div className="prose prose-invert prose-sm max-w-none text-neutral-400 border-t border-neutral-800 pt-4">
                                    <p className="whitespace-pre-wrap">{t('licenseText')}</p>
                                    <p className="mt-4 text-xs text-neutral-500">
                                        © {new Date().getFullYear()} Rekwizytor. All rights reserved.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Credits */}
                    <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Info className="w-5 h-5 text-purple-400" />
                            {t('credits')}
                        </h2>
                        <p className="text-sm text-neutral-400">
                            {t('creditsText')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
