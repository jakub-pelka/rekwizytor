'use client'

import { useState } from 'react'
import { FileText, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'

type Note = Database['public']['Tables']['notes']['Row']

interface Props {
    readonly notes: Note[]
    readonly performanceId: string
    readonly title: string
    readonly performanceColor?: string | null
}

export function PerformanceNotesPreview({ notes, performanceId, title, performanceColor }: Props) {
    const t = useTranslations('ProductionDetails')
    // Only show top 5 recent notes
    const recentNotes = notes.slice(0, 5)

    const masterColor = performanceColor || '#f59e0b' // amber-500 fallback

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
                <h3 className="font-bold text-neutral-200 flex items-center gap-2 font-sans text-base">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    {t('notesTitle')}
                </h3>
                <Link
                    href={`/notes?context=performance&id=${performanceId}`}
                    className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center"
                >
                    {t('viewAllNotes', { count: notes.length })} <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="flex-1 p-2 space-y-2">
                {recentNotes.length > 0 ? (
                    recentNotes.map(note => (
                        <Link
                            key={note.id}
                            href={`/notes/${note.id}`}
                            className="block p-3 rounded-lg hover:bg-neutral-800/50 border border-transparent hover:border-neutral-700 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span
                                    className={`text-sm font-medium line-clamp-1 group-hover:text-white`}
                                    style={{ color: note.is_master ? masterColor : '#d4d4d4' }}
                                >
                                    {note.title}
                                </span>
                                {note.is_master && (
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded border"
                                        style={{
                                            backgroundColor: `${masterColor}1A`, // 10% opacity
                                            color: masterColor,
                                            borderColor: `${masterColor}33` // 20% opacity
                                        }}
                                    >
                                        Master
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[10px] text-neutral-500">
                                    {note.updated_at && format(new Date(note.updated_at), 'MMM d')}
                                </span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-6 text-center text-neutral-500">
                        <p className="text-xs mb-3">{t('noNotes')}</p>
                        <Link
                            href={`/notes?create=true&performanceId=${performanceId}`}
                            className="inline-flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-md transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            {t('addNote')}
                        </Link>
                    </div>
                )}
            </div>

            {recentNotes.length > 0 && (
                <div className="p-2 border-t border-neutral-800 bg-neutral-900/30">
                    <Link
                        href={`/notes?create=true&performanceId=${performanceId}`}
                        className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors border border-dashed border-neutral-800 hover:border-neutral-700"
                    >
                        <Plus className="w-3 h-3" />
                        {t('addNewNote')}
                    </Link>
                </div>
            )}
        </div>
    )
}
