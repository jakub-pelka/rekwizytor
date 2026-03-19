'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, ChevronLeft, ArrowRight, X, Clock } from 'lucide-react'
import { LiveScene } from '@/utils/note-parser'
import { Database } from '@/types/supabase'
import { clsx } from 'clsx'

type SceneChecklist = Database['public']['Tables']['scene_checklists']['Row']

interface LiveNoteViewProps {
    performanceId: string
    scenes: LiveScene[]
    activeChecklist: SceneChecklist | null
}

export function LiveNoteView({ performanceId, scenes, activeChecklist }: LiveNoteViewProps) {
    const supabase = createClient()
    const router = useRouter()

    // State
    const [checklistData, setChecklistData] = useState<SceneChecklist | null>(activeChecklist)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
    const [activeSceneIndex, setActiveSceneIndex] = useState(0)
    const [isStarted, setIsStarted] = useState(!!activeChecklist?.is_active)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [now, setNow] = useState(Date.now())
    const [isFinishing, setIsFinishing] = useState(false)

    // Load checked state from active checklist JSON
    useEffect(() => {
        if (checklistData?.checklist_state) {
            setCheckedItems(checklistData.checklist_state as Record<string, boolean>)
        }
    }, [checklistData])

    // Timer tick
    useEffect(() => {
        if (!isStarted) return
        const interval = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [isStarted])

    // Load/Set Start Time
    useEffect(() => {
        if (isStarted && !startTime) {
            const stored = localStorage.getItem(`live_note_start_${performanceId}`)
            if (stored) {
                setStartTime(parseInt(stored))
            } else {
                const newStart = Date.now()
                setStartTime(newStart)
                localStorage.setItem(`live_note_start_${performanceId}`, newStart.toString())
            }
        }
    }, [isStarted, performanceId, startTime])

    // Derived state
    const currentScene = scenes[activeSceneIndex]
    const nextScene = scenes[activeSceneIndex + 1]
    const prevScene = scenes[activeSceneIndex - 1]
    const currentDuration = startTime ? now - startTime : 0

    // Handlers
    const handleToggleItem = async (itemId: string) => {
        const newState = !checkedItems[itemId]
        const newCheckedItems = { ...checkedItems, [itemId]: newState }

        // Optimistic
        setCheckedItems(newCheckedItems)

        // Persist only if we have an active checklist run (DB row)
        if (checklistData) {
            await supabase
                .from('scene_checklists')
                .update({ checklist_state: newCheckedItems })
                .eq('id', checklistData.id)
        }
    }

    const handleStart = async () => {
        // Create a new checklist run if none exists (or reuse passed one if valid)
        let checklistId = checklistData?.id

        if (!checklistId) {
            // Create new run
            const { data, error } = await supabase
                .from('scene_checklists')
                .insert({
                    performance_id: performanceId,
                    show_date: new Date().toISOString(),
                    scene_number: '1',
                    is_active: true,
                    checklist_state: {}
                })
                .select()
                .single()

            if (data) {
                setChecklistData(data)
                checklistId = data.id
            }
        } else {
            await supabase
                .from('scene_checklists')
                .update({ is_active: true })
                .eq('id', checklistId)
        }

        setIsStarted(true)
        setStartTime(Date.now())
        localStorage.setItem(`live_note_start_${performanceId}`, Date.now().toString())
    }

    const handleNextScene = () => {
        if (nextScene) {
            setActiveSceneIndex(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            // Finish show
            handleFinish()
        }
    }

    const handlePrevScene = () => {
        if (prevScene) {
            setActiveSceneIndex(prev => prev - 1)
        }
    }

    const handleFinish = async () => {
        setIsFinishing(true)
        if (checklistData) {
            await supabase
                .from('scene_checklists')
                .update({ is_active: false })
                .eq('id', checklistData.id)
        }
        localStorage.removeItem(`live_note_start_${performanceId}`)
        setIsStarted(false)
        setIsFinishing(false)
        router.push(`/performances/${performanceId}`)
    }

    const formatDuration = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor((ms / (1000 * 60 * 60)))
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    if (!currentScene) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Brak scen</h2>
                    <p className="text-neutral-400">Notatka nie zawiera nagłówków ani list zadań.</p>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-neutral-800 rounded">Powrót</button>
                </div>
            </div>
        )
    }

    // -- RENDER: Locked / Start Screen --
    if (!isStarted) {
        return (
            <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-8 z-50">
                <div className="w-24 h-24 bg-burgundy-main/20 rounded-full flex items-center justify-center animate-pulse">
                    <Clock className="w-12 h-12 text-burgundy-main" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gotowy do spektaklu?</h1>
                    <p className="text-neutral-400">Pobrano scenariusz: {scenes.length} scen/etapów.</p>
                </div>
                <button
                    onClick={handleStart}
                    className="w-full max-w-sm py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors text-lg flex items-center justify-center gap-2"
                >
                    <CheckCircle2 className="w-6 h-6" />
                    Rozpocznij
                </button>
            </div>
        )
    }

    // -- RENDER: PreShow / Stage 0 --
    if (currentScene.type === 'preshow') {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
                {/* Header (No Timer) */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center gap-2 text-neutral-400">
                        <span className="text-sm uppercase tracking-wider font-bold">Przygotowanie</span>
                    </div>
                    <button onClick={handleFinish} className="text-neutral-500 hover:text-white p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
                    <h2 className="text-4xl font-bold mb-8 text-burgundy-main">{currentScene.name}</h2>

                    <div className="space-y-4">
                        {currentScene.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleToggleItem(item.id)}
                                className={clsx(
                                    "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 group",
                                    checkedItems[item.id]
                                        ? "bg-green-900/10 border-green-900/30 opacity-50"
                                        : "bg-neutral-900 border-white/5 hover:border-white/10 active:scale-[0.99]"
                                )}
                            >
                                <div className={clsx(
                                    "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                    checkedItems[item.id]
                                        ? "bg-green-600 border-green-600"
                                        : "border-neutral-600 group-hover:border-neutral-400"
                                )}>
                                    {checkedItems[item.id] && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <span className={clsx(
                                    "text-lg leading-relaxed",
                                    (() => {
                                        if (checkedItems[item.id]) return "line-through text-neutral-500"
                                        if (item.text.trim().startsWith('(') || item.text.trim().startsWith('[')) return "text-amber-400 italic"
                                        return "text-white"
                                    })()
                                )}>
                                    {item.text}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Nav */}
                <div className="p-4 border-t border-white/5 bg-neutral-900 sticky bottom-0 z-20 flex justify-between items-center">
                    <div /> {/* Spacer */}
                    <button
                        onClick={handleNextScene}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-bold hover:bg-neutral-200 transition-colors"
                    >
                        Rozpocznij Spektakl
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )
    }

    // -- RENDER: ACT Title Card --
    if (currentScene.type === 'act') {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 to-black pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-burgundy-main to-transparent opacity-50" />

                <div className="relative z-10 max-w-lg w-full space-y-12">

                    {/* Title */}
                    <div className="space-y-4">
                        <span className="text-burgundy-main font-mono text-sm uppercase tracking-[0.2em]">Nowy Etap</span>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
                            {currentScene.name}
                        </h1>
                    </div>

                    {/* Stats / Info */}
                    <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/10">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-neutral-500 text-xs uppercase tracking-wider">Czas Trwania</span>
                            <span className="text-2xl font-mono font-bold text-neutral-200">
                                {formatDuration(currentDuration)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-neutral-500 text-xs uppercase tracking-wider">Następna Scena</span>
                            <span className="text-xl font-bold text-neutral-200 truncate max-w-[150px]">
                                {nextScene?.name || 'Koniec'}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        <button
                            onClick={handleNextScene}
                            className="w-full py-5 bg-white text-black rounded-2xl font-bold text-xl hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/5"
                        >
                            Rozpocznij {currentScene.name}
                            <ArrowRight className="w-6 h-6" />
                        </button>

                        <button
                            onClick={() => router.push(`/performances/${performanceId}`)}
                            className="w-full py-4 bg-transparent text-neutral-400 hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-white/20"
                        >
                            <X className="w-4 h-4" />
                            Wyjście (Timer w tle)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // -- RENDER: Normal Scene --
    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Top Bar */}
            <header className="h-16 border-b border-white/10 bg-neutral-900/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="bg-neutral-800 px-3 py-1 rounded text-sm font-mono text-neutral-400">
                        {formatDuration(currentDuration)}
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="text-lg font-bold truncate max-w-[200px]">
                        {currentScene.name}
                    </div>
                </div>
                <button
                    onClick={handleFinish}
                    disabled={isFinishing}
                    className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full pb-32">
                {currentScene.items.length === 0 ? (
                    <div className="text-center py-20 text-neutral-500 italic">
                        Brak zadań/rekwizytów w tej scenie.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentScene.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleToggleItem(item.id)}
                                className={clsx(
                                    "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 select-none touch-manipulation",
                                    checkedItems[item.id]
                                        ? "bg-green-950/20 border-green-900/30"
                                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 active:scale-[0.98]"
                                )}
                            >
                                <div className={clsx(
                                    "mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                    checkedItems[item.id]
                                        ? "bg-green-500 border-green-500"
                                        : "border-neutral-600"
                                )}>
                                    {checkedItems[item.id] && <CheckCircle2 className="w-5 h-5 text-black" />}
                                </div>
                                <span className={clsx(
                                    "text-xl font-medium leading-normal",
                                    (() => {
                                        if (checkedItems[item.id]) return "text-neutral-500 line-through decoration-2"
                                        if (item.text.trim().startsWith('(') || item.text.trim().startsWith('[')) return "text-amber-400 italic"
                                        return "text-white"
                                    })()
                                )}>
                                    {item.text}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Bottom Navigation Control - Big Buttons */}
            <nav className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-30 pb- safe-pb">
                <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
                    <button
                        onClick={handlePrevScene}
                        disabled={!prevScene}
                        className="px-6 py-4 rounded-xl bg-neutral-900 border border-white/10 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-neutral-800 active:bg-neutral-700 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                        Poprzednia
                    </button>

                    <button
                        onClick={handleNextScene}
                        className={clsx(
                            "px-6 py-4 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-white/5",
                            nextScene ? "bg-white hover:bg-neutral-200" : "bg-red-500 text-white hover:bg-red-600"
                        )}
                    >
                        {nextScene ? (
                            <>
                                Następna: {nextScene.name.slice(0, 15)}{nextScene.name.length > 15 ? '...' : ''}
                                <ChevronRight className="w-6 h-6" />
                            </>
                        ) : (
                            <>
                                Zakończ Spektakl
                                <CheckCircle2 className="w-6 h-6" />
                            </>
                        )}
                    </button>
                </div>
            </nav>
        </div>
    )
}
