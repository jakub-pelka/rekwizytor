'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import NextImage from 'next/image'

import { Database } from '@/types/supabase'

interface TrashListProps {
    readonly initialPerformances: Database['public']['Tables']['performances']['Row'][]
}

export function TrashList({ initialPerformances }: TrashListProps) {
    const t = useTranslations('Trash')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS
    const router = useRouter()
    const supabase = createClient()

    const [performances, setPerformances] = useState(initialPerformances)
    const [loading, setLoading] = useState<string | null>(null)

    const handleRestore = async (id: string) => {
        setLoading(id)
        const { error } = await supabase
            .from('performances')
            .update({ deleted_at: null })
            .eq('id', id)

        if (!error) {
            setPerformances(performances.filter(p => p.id !== id))
            router.refresh()
        }
        setLoading(null)
    }

    const handleDeleteForever = async (id: string) => {
        if (!confirm(t('deleteForeverConfirm'))) return

        setLoading(id)
        const { error } = await supabase
            .from('performances')
            .delete()
            .eq('id', id)

        if (!error) {
            setPerformances(performances.filter(p => p.id !== id))
            router.refresh()
        }
        setLoading(null)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-lg font-medium text-white mb-4">
                    {t('performances')} ({performances.length})
                </h2>

                {performances.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{t('noDeletedPerformances')}</p>
                    </div>
                ) : (
                    performances.map(perf => (
                        <div key={perf.id} className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 relative bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                    {perf.image_url ? ( // performances uses image_url or thumbnail_url? types say images...
                                        <NextImage
                                            src={perf.image_url}
                                            alt={perf.title}
                                            fill
                                            className="object-cover opacity-50 grayscale"
                                            sizes="48px"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                            <span className="text-xs font-bold text-neutral-600">{perf.title[0]}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-medium text-neutral-300 line-through decoration-neutral-500">{perf.title}</h3>
                                    <p className="text-xs text-neutral-500">
                                        {t('deletedOn', { date: format(new Date(perf.deleted_at || new Date()), 'PPP', { locale: dateLocale }) })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRestore(perf.id)}
                                    disabled={loading === perf.id}
                                    className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-green-900/20 hover:text-green-400 transition-colors"
                                    title={t('restore')}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteForever(perf.id)}
                                    disabled={loading === perf.id}
                                    className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                                    title={t('deleteForever')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
