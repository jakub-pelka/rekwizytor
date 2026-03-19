'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import NoteEditor, { NoteEditorRef } from '@/components/notes/NoteEditor'
import SceneNoteEditor from '@/components/notes/SceneNoteEditor'
import { ArrowLeft, Share, Copy, Download, ChevronDown, Pencil, Check, Folder, Layers } from 'lucide-react'
import Link from 'next/link'
import { extractMentions } from '@/components/notes/utils'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { notify } from '@/utils/notify'

export default function NoteDetailPage() {
    const t = useTranslations('NoteDetail')
    const params = useParams()
    const searchParams = useSearchParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const [note, setNote] = useState<any>(null)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [performances, setPerformances] = useState<any[]>([])
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const editorRef = useRef<NoteEditorRef>(null)

    useEffect(() => {
        if (searchParams.get('edit') === 'true') {
            setIsEditing(true)
        }
    }, [searchParams])

    if (!id) return <div>{t('invalidId')}</div>

    const fetchNote = async () => {
        const { data: serverData } = await supabase.from('notes').select('*').eq('id', id).single()
        if (!serverData) return

        // Always use server version as source of truth
        // Check localStorage only if server is empty (new note)
        const content = serverData.content as any
        const isServerEmpty = !content ||
            !content.content ||
            content.content.length === 0 ||
            (content.content.length === 1 && !content.content[0].content)

        if (isServerEmpty) {
            const key = `rekwizytor_note_draft_${id}`
            const savedDraft = localStorage.getItem(key)
            if (savedDraft) {
                try {
                    const { content: localContent } = JSON.parse(savedDraft)
                    console.log('Server empty, using localStorage backup')
                    setNote({ ...serverData, content: localContent })
                    setTitle(serverData.title)
                    // Auto-enter edit mode for new/empty notes if we restored a draft? 
                    // Or maybe just let user click edit. Let's stick to strict view mode by default.
                    return
                } catch (e) {
                    console.error('Failed to parse local draft', e)
                }
            }
        }

        // Use server data
        setNote(serverData)
        setTitle(serverData.title)
    }

    useEffect(() => {
        if (id) fetchNote()
        fetchPerformances()

        // Save on browser close/tab close
        const handleBeforeUnload = () => {
            if (editorRef.current && isEditing) {
                const content = editorRef.current.getJSON()
                // Synchronous save on unload - use localStorage as backup
                // Server save will happen via onBlur which triggers before this
                const key = `rekwizytor_note_draft_${id}`
                localStorage.setItem(key, JSON.stringify({
                    content,
                    timestamp: new Date().toISOString()
                }))
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [id, isEditing])

    const fetchPerformances = async () => {
        const { data } = await supabase.from('performances').select('id, title').order('title')
        if (data) setPerformances(data)
    }

    // Debounce save
    const saveNote = useCallback(async (content: any) => {
        setSaving(true)
        await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id)

        // Update mentions
        const mentions = extractMentions(content)

        // Delete old mentions
        await supabase.from('note_mentions').delete().eq('note_id', id)

        // Insert new mentions
        if (mentions.length > 0) {
            const mentionsToInsert = mentions.map(m => ({
                note_id: id,
                mentioned_id: m.id,
                mention_type: m.type as "item" | "category" | "location" | "user" | "date",
                mention_label: m.label
            }))

            const validMentions = mentionsToInsert.filter(m =>
                m.mention_type !== 'date' &&
                m.mentioned_id &&
                // Simple UUID check
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.mentioned_id)
            )

            if (validMentions.length > 0) {
                await supabase.from('note_mentions').insert(validMentions)
            }
        }

        // Update local state to reflect saved content, preventing "revert" logic in editor
        setNote((prev: any) => ({ ...prev, content, updated_at: new Date().toISOString() }))

        setSaving(false)
    }, [id, supabase])

    const updateTitle = async () => {
        await supabase.from('notes').update({ title }).eq('id', id)
    }

    const exportNoteJson = () => {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(note.content, null, 2)], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
        setShowExportMenu(false)
        notify.successDownload('JSON wyeksportowany')
    }

    const getNoteText = () => {
        let text = ''
        if (note.content && note.content.content) {
            text = note.content.content.map((block: any) => {
                if (block.content) {
                    return block.content.map((span: any) => {
                        if (span.type === 'text') return span.text
                        if (span.type === 'userMention') return `@${span.attrs.label}`
                        if (span.type === 'slashMention') return `${span.attrs.label}`
                        return ''
                    }).join('')
                }
                return ''
            }).join('\n')
        }
        return text
    }

    const exportNoteTxt = () => {
        const text = getNoteText()
        const element = document.createElement("a");
        const file = new Blob([text], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
        setShowExportMenu(false)
        notify.successDownload('Plik tekstowy pobrany')
    }

    const exportNoteMd = () => {
        const text = getNoteText()
        const element = document.createElement("a");
        const file = new Blob([text], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
        setShowExportMenu(false)
        notify.successDownload('Markdown wyeksportowany')
    }

    const copyToClipboard = () => {
        const text = getNoteText()
        navigator.clipboard.writeText(text)
        setShowExportMenu(false)
        notify.success('Link skopiowany do schowka')
    }

    const toggleEditMode = async () => {
        if (isEditing) {
            if (editorRef.current) {
                const content = editorRef.current.getJSON()
                await saveNote(content)
            }
        }
        setIsEditing(!isEditing)
    }

    if (!note) return <div className="p-6">{t('loading')}</div>

    const assignedPerformance = performances.find(p => p.id === note.performance_id)

    return (
        <div className="w-full relative min-h-screen">
            <div className="p-6 w-full relative z-10">
                <div className="max-w-3xl mx-auto mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={async () => {
                                // Force save before navigation if editing
                                if (isEditing && editorRef.current) {
                                    const content = editorRef.current.getJSON()
                                    await saveNote(content)
                                }
                                router.push('/notes')
                            }}
                            className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <div className="flex-1"></div>

                        <div className="flex items-center gap-2">
                            {/* Folder/Performance Indicator/Selector */}
                            {isEditing ? (
                                <div className="relative group">
                                    <select
                                        value={note.performance_id || ''}
                                        onChange={async (e) => {
                                            const val = e.target.value || null
                                            setNote({ ...note, performance_id: val })
                                            await supabase.from('notes').update({ performance_id: val }).eq('id', id)
                                        }}
                                        className="appearance-none bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-amber-900/50 max-w-[120px] md:max-w-none truncate"
                                    >
                                        <option value="">{t('privateNote')}</option>
                                        {performances.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/50 border border-neutral-800/50 text-xs font-medium text-neutral-400 cursor-default">
                                    <Folder size={12} />
                                    <span>{assignedPerformance ? assignedPerformance.title : t('privateNote')}</span>
                                </div>
                            )}

                            {/* View/Edit Toggle */}
                            {(title.startsWith('Notatka sceniczna') && note.performance_id && !isEditing) ? (
                                <DropdownAction
                                    label={t('edit')}
                                    icon={<Pencil size={14} />}
                                    variant="secondary"
                                    className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border-none rounded-full px-3 py-1.5 h-auto text-xs font-bold"
                                    align="right"
                                    items={[
                                        {
                                            label: t('editNote'),
                                            onClick: () => void toggleEditMode()
                                        },
                                        {
                                            label: t('manageScenes'),
                                            onClick: () => router.push(`/performances/${note.performance_id}/scenes`)
                                        }
                                    ]}
                                />
                            ) : (
                                <button
                                    onClick={toggleEditMode}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                                        ${isEditing
                                            ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'}
                                    `}
                                >
                                    {isEditing ? (
                                        <>
                                            <Check size={14} strokeWidth={3} />
                                            <span className="hidden sm:inline">{t('done')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Pencil size={14} />
                                            <span className="hidden sm:inline">{t('edit')}</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Export Menu (Only in View Mode? Or both? User said "export allowed" in view mode. Probably both is fine, but maybe hide in edit mode to reduce clutter) */}
                            {!isEditing && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowExportMenu(!showExportMenu)}
                                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                                        title="Export"
                                    >
                                        <Share size={18} />
                                    </button>

                                    {showExportMenu && (
                                        <div className="absolute right-0 top-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1.5 min-w-[220px] z-50 flex flex-col gap-0.5">
                                            <button onClick={copyToClipboard} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                                <Copy size={16} />
                                                {t('copyContent')}
                                            </button>
                                            <div className="h-px bg-neutral-800 my-1 mx-2" />
                                            <button onClick={exportNoteMd} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                                <Download size={16} />
                                                {t('exportMarkdown')}
                                            </button>
                                            <button onClick={exportNoteTxt} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                                <Download size={16} />
                                                {t('exportTxt')}
                                            </button>
                                            <button onClick={exportNoteJson} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                                <Download size={16} />
                                                {t('exportJson')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={updateTitle}
                            placeholder={t('untitledNote')}
                            className="text-4xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-neutral-700 text-white"
                            autoFocus
                        />
                    ) : (
                        <h1 className="text-4xl font-bold text-white mb-2 selection:bg-amber-500/30">
                            {title || <span className="text-neutral-600 italic">{t('untitledNote')}</span>}
                        </h1>
                    )}

                </div>

                {(title.startsWith('Notatka sceniczna') && note.performance_id) ? (
                    <SceneNoteEditor
                        noteId={note.id}
                        initialContent={note.content}
                        performanceId={note.performance_id}
                        onSave={saveNote}
                        readOnly={!isEditing}
                    />
                ) : (
                    <NoteEditor
                        ref={editorRef}
                        initialContent={note.content}
                        noteId={note.id}
                        serverUpdatedAt={note.updated_at}
                        onSave={saveNote}
                        readOnly={!isEditing}
                    />
                )}
            </div>
        </div>
    )
}

