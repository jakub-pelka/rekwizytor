'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import {
    CheckCircle2,
    Circle,
    Menu,
    X,
    Play,
    Pause,
    RotateCcw,
    User,
    AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Database } from '@/types/supabase'

type Scene = Database['public']['Tables']['scenes']['Row']
type Task = Database['public']['Tables']['scene_tasks']['Row']

type Props = {
    readonly performanceId: string
    readonly initialScenes: Scene[]
    readonly initialTasks: Task[]
    readonly profiles?: readonly { readonly id: string; readonly full_name: string | null }[]
}

function SimpleLiveTaskItem({
    task,
    profiles,
    handleAssign,
    toggleCompleted,
    safeVibrate,
    t
}: {
    readonly task: Task
    readonly profiles: Props['profiles']
    readonly handleAssign: (taskId: string, userId: string) => void
    readonly toggleCompleted: (id: string, currentState: boolean | null) => void
    readonly safeVibrate: () => void
    readonly t: any
}) {
    const profile = profiles?.find(p => p.id === task.assigned_to)

    return (
        <div
            className={clsx(
                "group flex items-center justify-between py-4 px-4 border-b border-neutral-800 transition-colors",
                task.is_completed
                    ? "bg-neutral-900/10"
                    : "hover:bg-neutral-900/30"
            )}
        >
            {/* Left: Content */}
            <div className="flex-1 min-w-0 mr-6">
                <h4 className={clsx(
                    "text-lg font-medium leading-snug transition-colors",
                    task.is_completed ? "text-neutral-500 line-through decoration-neutral-700" : "text-white"
                )}>
                    {task.content}
                </h4>
                {task.live_notes && (
                    <p className="text-sm text-yellow-500/80 mt-1 font-mono">
                        {task.live_notes}
                    </p>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 shrink-0">
                {/* Assignment */}
                <div className="relative">
                    <select
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        value={task.assigned_to || ''}
                        onChange={(e) => handleAssign(task.id, e.target.value)}
                    >
                        <option value="">{t('unassigned')}</option>
                        {profiles?.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name || 'User'}</option>
                        ))}
                    </select>
                    <div className={clsx(
                        "h-8 w-8 rounded-full flex items-center justify-center border transition-colors overflow-hidden",
                        task.assigned_to
                            ? "border-neutral-600 bg-neutral-800"
                            : "border-transparent bg-neutral-900 text-neutral-600 group-hover:border-neutral-700"
                    )}>
                        {task.assigned_to ? (
                            <span className="text-xs font-bold text-white">{profile?.full_name?.[0] || '?'}</span>
                        ) : (
                            <User className="h-4 w-4" />
                        )}
                    </div>
                </div>

                {/* Completion Toggle */}
                <button
                    onClick={() => {
                        safeVibrate()
                        toggleCompleted(task.id, task.is_completed)
                    }}
                    className={clsx(
                        "flex items-center justify-center h-10 w-10 rounded-full border transition-all active:scale-95 touch-manipulation",
                        task.is_completed
                            ? "bg-green-500/10 border-green-500/50 text-green-500"
                            : "bg-transparent border-neutral-700 text-neutral-600 hover:border-neutral-500 hover:text-neutral-400"
                    )}
                >
                    {task.is_completed ? (
                        <CheckCircle2 className="h-6 w-6" />
                    ) : (
                        <Circle className="h-6 w-6" />
                    )}
                </button>
            </div>
        </div>
    )
}

function SceneSidebar({
    scenes,
    tasks,
    activeSceneId,
    setActiveSceneId,
    isSidebarOpen,
    setIsSidebarOpen,
    resetAllTasks,
    router,
    t
}: {
    readonly scenes: Scene[]
    readonly tasks: Task[]
    readonly activeSceneId: string
    readonly setActiveSceneId: (id: string) => void
    readonly isSidebarOpen: boolean
    readonly setIsSidebarOpen: (open: boolean) => void
    readonly resetAllTasks: () => void
    readonly router: any
    readonly t: any
}) {
    return (
        <div className={clsx(
            "fixed md:relative z-50 w-72 h-full bg-[#1a1a1a] border-r border-neutral-800 transform transition-transform duration-300 ease-in-out flex flex-col shrink-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="p-4 border-b border-neutral-800/50 flex justify-between items-center shrink-0 h-16 bg-[#1a1a1a]">
                <h2 className="font-bold text-neutral-400 text-sm uppercase tracking-wider pl-2">{t('scenes')}</h2>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden text-neutral-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 bg-[#1a1a1a]">
                {scenes.map((scene, index) => {
                    const sceneTasks = tasks.filter(t => t.scene_id === scene.id)
                    const total = sceneTasks.length
                    const completed = sceneTasks.filter(t => t.is_completed).length
                    const isComplete = total > 0 && completed === total
                    const isActive = activeSceneId === scene.id

                    const prevScene = scenes[index - 1]
                    const isNewAct = prevScene && prevScene.act_number !== scene.act_number

                    return (
                        <div key={scene.id}>
                            {isNewAct && (
                                <div className="px-3 py-3 mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                    {t('act', { number: scene.act_number ?? 0 })}
                                    <div className="h-px bg-neutral-800 flex-1 opacity-50" />
                                </div>
                            )}
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setActiveSceneId(scene.id)
                                        setIsSidebarOpen(false)
                                    }}
                                    className={clsx(
                                        "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative z-10 flex items-center justify-between group",
                                        isActive
                                            ? "bg-neutral-800 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                                    )}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx("truncate", isActive ? "text-white" : "text-neutral-400 group-hover:text-white")}>
                                                {scene.scene_number === 0 ? t('preparation') : t('scene', { number: scene.scene_number })}
                                            </span>
                                            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />}
                                        </div>
                                        {(scene.name && scene.scene_number !== 0) && (
                                            <span className="text-xs truncate opacity-60 font-normal">
                                                {scene.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Pill */}
                                    {total > 0 && (
                                        <div className={clsx(
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                            isActive ? "bg-black/30 text-neutral-300" : "bg-neutral-900 text-neutral-500"
                                        )}>
                                            {completed}/{total}
                                        </div>
                                    )}
                                </button>
                                {isActive && (
                                    <motion.div
                                        layoutId="live-sidebar-active-indicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded-r-full pointer-events-none z-20"
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-[#1a1a1a] space-y-2">
                <button
                    onClick={resetAllTasks}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-yellow-900/10 hover:text-yellow-400 transition-colors text-xs font-medium uppercase tracking-wider"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('resetAll') || 'Reset'}
                </button>
                <button
                    onClick={() => router.push('/')}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/10 hover:text-red-400 transition-colors text-xs font-medium uppercase tracking-wider"
                >
                    <X className="w-3.5 h-3.5" />
                    {t('exit') || 'Exit'}
                </button>
            </div>
        </div>
    )
}

function LiveHeader({
    currentScene,
    isTimerRunning,
    elapsedTime,
    formatDuration,
    startTimer,
    pauseTimer,
    resetTimer,
    setIsSidebarOpen,
    t
}: {
    readonly currentScene?: Scene
    readonly isTimerRunning: boolean
    readonly elapsedTime: number
    readonly formatDuration: (ms: number) => string
    readonly startTimer: () => void
    readonly pauseTimer: () => void
    readonly resetTimer: () => void
    readonly setIsSidebarOpen: (open: boolean) => void
    readonly t: any
}) {
    return (
        <div className="h-20 border-b border-neutral-800 flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0 z-30 sticky top-0">
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 -ml-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 shrink-0"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="flex flex-col justify-center min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#A0232F] leading-none mb-0.5">
                        {t('currentScene')}
                    </span>
                    <h1 className="text-2xl font-boldonse text-white leading-tight truncate pb-1">
                        {currentScene?.scene_number === 0
                            ? t('preparation')
                            : `${t('scene', { number: currentScene?.scene_number ?? '?' })} ${currentScene?.name || ''}`}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="font-mono text-3xl font-light text-neutral-200 tracking-wider">
                    {formatDuration(elapsedTime)}
                </div>
                <div className="flex gap-2">
                    {!isTimerRunning ? (
                        <button
                            onClick={startTimer}
                            className="p-3 bg-green-600/20 text-green-500 rounded-xl hover:bg-green-600/30 transition-colors"
                            title="Start"
                        >
                            <Play className="w-5 h-5 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={pauseTimer}
                            className="p-3 bg-yellow-600/20 text-yellow-500 rounded-xl hover:bg-yellow-600/30 transition-colors"
                            title="Pause"
                        >
                            <Pause className="w-5 h-5 fill-current" />
                        </button>
                    )}
                    <button
                        onClick={resetTimer}
                        className="p-3 bg-neutral-800 text-neutral-400 rounded-xl hover:bg-neutral-700 hover:text-white transition-colors"
                        title="Reset"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export function SimpleLiveView({
    performanceId,
    initialScenes,
    initialTasks,
    profiles = []
}: Props) {
    const t = useTranslations('LivePerformance')
    const router = useRouter()
    const [supabase] = useState(() => createClient())

    // State
    const [scenes] = useState<Scene[]>(initialScenes)
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // Timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0) // in milliseconds
    const [timerStartTime, setTimerStartTime] = useState<number | null>(null)

    // Sort scenes by act and scene number
    const sortedScenes = useMemo(() => {
        return [...scenes].sort((a, b) => {
            if (a.act_number !== b.act_number) {
                return (a.act_number || 0) - (b.act_number || 0)
            }
            return a.scene_number - b.scene_number
        })
    }, [scenes])

    // Active scene (first one by default)
    const [activeSceneId, setActiveSceneId] = useState<string>(sortedScenes[0]?.id)

    // Filter tasks for current scene
    const currentSceneTasks = useMemo(() => {
        return tasks.filter(task => task.scene_id === activeSceneId)
    }, [tasks, activeSceneId])

    const currentScene = sortedScenes.find(s => s.id === activeSceneId)

    // Timer effect
    useEffect(() => {
        if (!isTimerRunning) return

        const interval = setInterval(() => {
            if (timerStartTime) {
                setElapsedTime(Date.now() - timerStartTime)
            }
        }, 100) // Update every 100ms for smooth display

        return () => clearInterval(interval)
    }, [isTimerRunning, timerStartTime])

    // Realtime Subscriptions
    useEffect(() => {
        const channelName = `live-performance-${performanceId}-${Date.now()}`
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scene_tasks',
                },
                (payload) => {
                    const newTask = payload.new as Task
                    const updateTask = (prev: Task[]) => prev.map(task =>
                        task.id === newTask.id
                            ? {
                                ...task,
                                is_completed: newTask.is_completed,
                                live_notes: newTask.live_notes,
                                assigned_to: newTask.assigned_to
                            }
                            : task
                    )
                    setTasks(updateTask)
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionError(null)
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to live performance channel:', err)
                    setConnectionError('Błąd połączenia z serwerem (Realtime). Zmiany mogą nie być widoczne.')
                } else if (status === 'TIMED_OUT') {
                    setConnectionError('Przekroczono limit czasu połączenia. Odśwież stronę.')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, performanceId])

    const startTimer = () => {
        if (!isTimerRunning) {
            const now = Date.now()
            setTimerStartTime(now - elapsedTime)
            setIsTimerRunning(true)
        }
    }

    const pauseTimer = () => {
        setIsTimerRunning(false)
    }

    const resetTimer = () => {
        setIsTimerRunning(false)
        setElapsedTime(0)
        setTimerStartTime(null)
    }

    const toggleCompleted = async (id: string, currentState: boolean | null) => {
        const newState = !currentState
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, is_completed: newState } : task
        ))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ is_completed: newState })
            .eq('id', id)

        if (error) {
            console.error('Error updating completion status:', error)
            setTasks(prev => prev.map(task =>
                task.id === id ? { ...task, is_completed: currentState } : task
            ))
        }
    }

    const handleAssign = async (taskId: string, userId: string) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, assigned_to: userId } : task
        ))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ assigned_to: userId })
            .eq('id', taskId)

        if (error) {
            console.error('Error assigning user:', error)
        }
    }

    const resetAllTasks = async () => {
        if (!confirm(t('confirmResetAll') || 'Czy na pewno chcesz zresetować wszystkie oznaczenia?')) {
            return
        }

        const allSceneIds = scenes.map(s => s.id)
        setTasks(prev => prev.map(task => ({ ...task, is_completed: false })))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ is_completed: false })
            .in('scene_id', allSceneIds)

        if (error) {
            console.error('Error resetting tasks:', error)
            globalThis.location.reload()
        }
    }

    const formatDuration = (ms: number) => {
        if (ms < 0) ms = 0
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor((ms / (1000 * 60 * 60)))

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const safeVibrate = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50)
            }
        } catch (error) {
            console.error('Vibration API error:', error)
        }
    }

    return (
        <div className="fixed inset-0 z-100 md:static md:z-0 md:inset-auto flex h-dvh md:h-[calc(100vh)] bg-[#0a0a0a] text-white overflow-hidden font-sans">
            {connectionError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-200 w-[90%] max-w-md">
                    <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium flex-1">{connectionError}</p>
                        <button
                            onClick={() => setConnectionError(null)}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setIsSidebarOpen(false)
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Close sidebar"
                />
            )}

            <SceneSidebar
                scenes={sortedScenes}
                tasks={tasks}
                activeSceneId={activeSceneId}
                setActiveSceneId={setActiveSceneId}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                resetAllTasks={resetAllTasks}
                router={router}
                t={t}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] relative min-w-0">
                <LiveHeader
                    currentScene={currentScene}
                    isTimerRunning={isTimerRunning}
                    elapsedTime={elapsedTime}
                    formatDuration={formatDuration}
                    startTimer={startTimer}
                    pauseTimer={pauseTimer}
                    resetTimer={resetTimer}
                    setIsSidebarOpen={setIsSidebarOpen}
                    t={t}
                />

                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-0 md:p-8">
                    {currentSceneTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                            <p>{t('noItemsInScene') || 'Brak zadań w tej scenie'}</p>
                        </div>
                    ) : (
                        currentSceneTasks.map((task) => (
                            <SimpleLiveTaskItem
                                key={task.id}
                                task={task}
                                profiles={profiles}
                                handleAssign={handleAssign}
                                toggleCompleted={toggleCompleted}
                                safeVibrate={safeVibrate}
                                t={t}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
