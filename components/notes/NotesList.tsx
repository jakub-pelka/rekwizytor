'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, StickyNote, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'
import { Button } from '@/components/ui/Button'
import { extractTextFromContent } from './utils'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { motion } from 'framer-motion'

export default function NotesList({ performanceId, initialNotes = [] }: { performanceId?: string, initialNotes?: any[] }) {
    const t = useTranslations('NotesList')
    const [notes, setNotes] = useState<any[]>(initialNotes)
    const [loading, setLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    // Only fetch if performanceId changes (for filtered views)
    useEffect(() => {
        if (performanceId) {
            fetchNotes()
        }
    }, [performanceId])

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            const perfIdFromUrl = searchParams.get('performanceId')
            // Avoid double creation? strict mode?
            // Clean up params?
            // Check if we are already creating?
            // Simple approach: Create and redirect immediately.
            createNote(perfIdFromUrl || performanceId)
        }
    }, [searchParams])

    const fetchNotes = async () => {
        setLoading(true)
        let query = supabase
            .from('notes')
            .select('*, performances(title, color)')
            .order('updated_at', { ascending: false })

        if (performanceId) {
            query = query.eq('performance_id', performanceId)
        }

        const { data } = await query
        if (data) {
            setNotes(data)
            // Initialize all groups as expanded
            const groups: Record<string, boolean> = { 'general': true }
            data.forEach((note: any) => {
                if (note.performance_id) {
                    groups[note.performance_id] = true
                }
            })
            setExpandedGroups(groups)
        }
        setLoading(false)
    }

    const createNote = async (overridePerformanceId?: string | null) => {
        const targetPerfId = overridePerformanceId || performanceId

        // Fetch performance title if needed for default title
        let title = `Note #${notes.length + 1}`

        if (targetPerfId) {
            const { data: perf } = await supabase.from('performances').select('title').eq('id', targetPerfId).single()
            if (perf) {
                title = `${perf.title} #${notes.length + 1}`
            }
        }

        const { data, error } = await supabase.from('notes').insert({
            title,
            performance_id: targetPerfId || null,
            content: {},
        }).select().single()

        if (data) {
            router.push(`/notes/${data.id}?edit=true`)
        }
    }

    const deleteNote = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return
        await supabase.from('notes').delete().eq('id', id)
        setNotes(notes.filter(n => n.id !== id))
    }

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    // Filter notes
    const filteredNotes = notes

    // Group notes - memoized to prevent recalculation
    const groupedNotes = useMemo(() => {
        const groups: Record<string, any> = {}

        filteredNotes.forEach((note: any) => {
            const key = note.performance_id || 'general'

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    // Only use t('generalNotes') for notes without performance_id
                    title: key === 'general' ? t('generalNotes') : (note.performances?.title || t('generalNotes')),
                    color: note.performances?.color || null,
                    notes: []
                }
            }

            groups[key].notes.push(note)
        })

        return groups
    }, [filteredNotes, t])

    // Sort groups: General first, then others - memoized
    const sortedGroups = useMemo(() => {
        const groups = Object.values(groupedNotes).sort((a: any, b: any) => {
            if (a.id === 'general') return -1
            if (b.id === 'general') return 1
            return a.title.localeCompare(b.title)
        })

        // Sort notes within groups
        groups.forEach((group: any) => {
            group.notes.sort((a: any, b: any) => {
                if (a.is_master && !b.is_master) return -1
                if (!a.is_master && b.is_master) return 1
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            })
        })

        return groups
    }, [groupedNotes])

    return (
        <div className="space-y-8">
            {/* Header */}
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                icon={<StickyNote className="h-6 w-6" />}
                iconColor="text-amber-400 bg-amber-400/10 border-amber-400/20"
            >
                <div className="flex w-full md:w-auto justify-end">
                    <Button
                        onClick={() => createNote()}
                        variant="glassy-primary"
                        className="w-full justify-center md:w-auto md:min-w-[140px]"
                    >
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('newNote')}</span>
                    </Button>
                </div>
            </PageHeader>

            {/* Filter Bar */}
            <FilterBar>
                <div className="w-full">
                    <MorphingSearchBar mode="trigger" context="note" className="w-full" />
                </div>
            </FilterBar>

            {(() => {
                if (loading) {
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-32 rounded-xl bg-neutral-900/40 border border-neutral-800 animate-pulse" />
                            ))}
                        </div>
                    )
                }
                if (notes.length === 0) {
                    return (
                        <div className="text-center py-20 bg-neutral-900/20 rounded-2xl border border-neutral-800/50 border-dashed">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800/50 mb-4 text-neutral-600">
                                <StickyNote className="w-8 h-8" />
                            </div>
                            <p className="text-xl font-bold text-neutral-500">{t('noNotes')}</p>
                            <p className="text-neutral-600 mt-2">Create a new note to get started.</p>
                        </div>
                    )
                }
                return (
                    <div className="space-y-8">
                    {sortedGroups.map((group: any) => (
                        <div key={group.id} className="space-y-4">
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="flex items-center gap-3 text-sm font-bold text-neutral-400 uppercase tracking-wider hover:text-white transition-colors w-full text-left py-2 group"
                            >
                                <div className="p-1 rounded-md bg-neutral-800 group-hover:bg-neutral-700 transition-colors">
                                    {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                {group.color && (
                                    <div
                                        className="h-4 w-1 rounded-full mr-1"
                                        style={{ backgroundColor: group.color }}
                                    />
                                )}
                                {group.title}
                                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full ml-1 border border-neutral-700">
                                    {group.notes.length}
                                </span>
                            </button>

                            {expandedGroups[group.id] && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                >
                                    {group.notes.map((note: any) => {
                                        const perfColor = note.performances?.color
                                        const isMaster = note.is_master

                                        return (
                                            <motion.div
                                                layout
                                                key={note.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`group relative rounded-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden cursor-pointer shadow-lg ${
                                                    isMaster
                                                        ? 'bg-amber-950/20 border border-amber-900/30 hover:border-amber-500/50'
                                                        : 'bg-neutral-900/40 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60'
                                                }`}
                                                style={isMaster ? {
                                                    boxShadow: perfColor ? `inset 4px 0 0 ${perfColor}` : `inset 4px 0 0 #d97706`
                                                } : undefined}
                                            >
                                                <Link href={`/notes/${note.id}`} className="flex-1 p-5 block h-full">
                                                    <div className="flex items-start justify-between gap-3 mb-3 pr-8">
                                                        <h3 className={`font-bold text-lg leading-tight line-clamp-2 ${isMaster ? 'text-amber-100' : 'text-neutral-200 group-hover:text-white'}`}>
                                                            {note.title}
                                                        </h3>
                                                        {isMaster && (
                                                            <div className="shrink-0">
                                                                <StickyNote
                                                                    size={18}
                                                                    className="text-amber-500"
                                                                    style={perfColor ? { color: perfColor } : undefined}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-neutral-400 line-clamp-4 leading-relaxed font-light">
                                                        {extractTextFromContent(note.content) || <span className="italic opacity-30">{t('noContent')}</span>}
                                                    </p>

                                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500 font-medium">
                                                        <span>{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
                                                    </div>
                                                </Link>

                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        deleteNote(note.id)
                                                    }}
                                                    className="absolute top-3 right-3 p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title={t('deleteNote')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
                )
            })()}
        </div>
    )
}
