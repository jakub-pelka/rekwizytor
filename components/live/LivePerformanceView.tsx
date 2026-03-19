'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { X, AlertTriangle } from 'lucide-react'
import { Database } from '@/types/supabase'
import { LiveChecklistItem } from './LiveChecklistItem'
import { useLivePerformanceTimer } from '../../hooks/useLivePerformanceTimer'
import { LivePerformanceHeader } from './LivePerformanceHeader'
import { LivePerformanceSidebar } from './LivePerformanceSidebar'
import { LiveBreakOverlay } from './LiveBreakOverlay'
import { LiveStatsOverlay } from './LiveStatsOverlay'
import { LiveConfirmOverlay } from './LiveConfirmOverlay'

type ChecklistItem = {
    id: string
    scene_checklist_id: string
    item_id: string
    is_prepared: boolean | null

    live_notes: string | null
    item_name_snapshot: string | null
    item_image_url_snapshot: string | null
    performance_prop_id: string | null
    assigned_to: string | null
}

type Checklist = {
    id: string
    act_number: number
    scene_number: number
    scene_name: string | null
    show_date: string
    is_active: boolean | null
    cast: string | null
    last_heartbeat?: string | null
}

type Props = {
    performanceId: string
    initialChecklists: Checklist[]
    initialItems: ChecklistItem[]
    profiles?: { id: string, full_name: string | null, avatar_url: string | null }[]
}

export function LivePerformanceView({ performanceId, initialChecklists, initialItems, profiles = [] }: Props) {
    const t = useTranslations('LivePerformance')
    const [supabase] = useState(() => createClient())
    const router = useRouter()

    const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists)
    const [items, setItems] = useState<ChecklistItem[]>(initialItems)
    const [forceStageAllId, setForceStageAllId] = useState<string | null>(null)
    const [isConfirmed, setIsConfirmed] = useState(() => initialChecklists.some(c => c.is_active))
    const [showStats, setShowStats] = useState(false)
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    const sortedChecklists = useMemo(() => {
        return [...checklists].sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0))
    }, [checklists])

    const activeSceneId = useMemo(() => {
        return checklists.find(c => c.is_active)?.id || sortedChecklists[0]?.id
    }, [checklists, sortedChecklists])

    const [localActiveSceneId, setLocalActiveSceneId] = useState<string>(activeSceneId)
    const currentChecklist = sortedChecklists.find(c => c.id === localActiveSceneId)

    const {
        now,
        startTime,
        actStartTime,
        endTime,
        setEndTime,
        isBreak,
        setIsBreak,
        breakStartTime,
        setBreakStartTime,
        totalBreakTime,
        setTotalBreakTime,
        clearLiveStorage,
        formatDuration
    } = useLivePerformanceTimer(performanceId, isConfirmed, currentChecklist)

    const startBreak = () => {
        const currentTime = Date.now()
        setIsBreak(true)
        setBreakStartTime(currentTime)
        localStorage.setItem(`live_view_is_break_${performanceId}`, 'true')
        localStorage.setItem(`live_view_break_start_${performanceId}`, currentTime.toString())

        const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
        if (activeIds.length > 0) {
            supabase.from('scene_checklists').update({ is_active: false }).in('id', activeIds).then()
            setChecklists(prev => prev.map(c => ({ ...c, is_active: false })))
        }
    }

    const endBreak = () => {
        const currentTime = Date.now()
        let addedBreakTime = 0
        if (breakStartTime) addedBreakTime = currentTime - breakStartTime

        const newTotalBreak = totalBreakTime + addedBreakTime
        setTotalBreakTime(newTotalBreak)
        setIsBreak(false)
        setBreakStartTime(null)

        localStorage.setItem(`live_view_total_break_${performanceId}`, newTotalBreak.toString())
        localStorage.removeItem(`live_view_is_break_${performanceId}`)
        localStorage.removeItem(`live_view_break_start_${performanceId}`)

        if (localActiveSceneId) {
            supabase.from('scene_checklists').update({ is_active: true }).eq('id', localActiveSceneId).then()
            setChecklists(prev => prev.map(c => c.id === localActiveSceneId ? { ...c, is_active: true } : c))
        }
    }

    const currentSceneItems = useMemo(() => {
        return items.filter(item => item.scene_checklist_id === localActiveSceneId)
    }, [items, localActiveSceneId])

    useEffect(() => {
        if (activeSceneId) setLocalActiveSceneId(activeSceneId)
    }, [activeSceneId])

    const finishScene = React.useCallback(async (forceFinish = false) => {
        const currentId = currentChecklist?.id || localActiveSceneId
        if (!currentId && !forceFinish) return

        const currentIndex = sortedChecklists.findIndex(c => c.id === currentId)
        const nextChecklist = sortedChecklists[currentIndex + 1]
        const isEndOfAct = nextChecklist && currentChecklist && nextChecklist.act_number !== currentChecklist.act_number
        const isLastScene = !nextChecklist

        if (forceFinish || isLastScene) {
            const currentTime = Date.now()
            setEndTime(currentTime)
            localStorage.setItem(`live_view_end_${performanceId}`, currentTime.toString())
            clearLiveStorage()
            setShowStats(true)
            if (forceFinish) {
                setChecklists(prev => prev.map(c => ({ ...c, is_active: false })))
                return
            }
            const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
            if (activeIds.length > 0) {
                await supabase.from('scene_checklists').update({ is_active: false }).in('id', activeIds)
            }
            setChecklists(prev => prev.map(c => ({ ...c, is_active: false })))
        } else if (isEndOfAct) {
            const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
            if (activeIds.length > 0) {
                await supabase.from('scene_checklists').update({ is_active: false }).in('id', activeIds)
            }
            setChecklists(prev => prev.map(c => ({ ...c, is_active: false })))
            if (nextChecklist) setLocalActiveSceneId(nextChecklist.id)
            startBreak()
        } else {
            const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
            if (activeIds.length > 0) {
                await supabase.from('scene_checklists').update({ is_active: false }).in('id', activeIds)
            }
            if (nextChecklist) {
                await supabase.from('scene_checklists').update({ is_active: true }).eq('id', nextChecklist.id)
                setChecklists(prev => prev.map(c => {
                    if (c.id === currentId) return { ...c, is_active: false }
                    if (c.id === nextChecklist.id) return { ...c, is_active: true }
                    return c
                }))
                setLocalActiveSceneId(nextChecklist.id)
            }
        }
    }, [currentChecklist, localActiveSceneId, sortedChecklists, checklists, supabase, performanceId, clearLiveStorage, startBreak, setEndTime])

    useEffect(() => {
        if (!isConfirmed) return
        const interval = setInterval(() => {
            const currentTime = Date.now()
            const start = startTime
            const currentBreakDuration = isBreak && breakStartTime ? currentTime - breakStartTime : 0
            if (start && (currentTime - start - totalBreakTime - currentBreakDuration > 10800000)) {
                finishScene(true)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [isConfirmed, startTime, isBreak, breakStartTime, totalBreakTime, finishScene])

    useEffect(() => {
        if (!isConfirmed || !activeSceneId || isBreak) return
        const sendHeartbeat = async () => {
            await supabase
                .from('scene_checklists')
                .update({ last_heartbeat: new Date().toISOString() } as Database['public']['Tables']['scene_checklists']['Update'])
                .eq('id', activeSceneId)
        }
        sendHeartbeat()
        const interval = setInterval(sendHeartbeat, 30000)
        return () => clearInterval(interval)
    }, [isConfirmed, activeSceneId, supabase, isBreak])

    useEffect(() => {
        const channelName = `live-performance-${performanceId}-${Date.now()}`
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scene_checklist_items' }, (payload) => {
                const newItem = payload.new as ChecklistItem
                setItems(prev => prev.map(item => item.id === newItem.id ? { ...item, ...newItem } : item))
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scene_checklists' }, (payload) => {
                const newChecklist = payload.new as Checklist
                setChecklists(prev => prev.map(c => c.id === newChecklist.id ? { ...c, ...newChecklist } : c))
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') setConnectionError(null)
                else if (status === 'CHANNEL_ERROR') setConnectionError(t('connectionError'))
                else if (status === 'TIMED_OUT') setConnectionError(t('timeoutError'))
            })
        return () => { supabase.removeChannel(channel) }
    }, [supabase, performanceId, t])

    const safeVibrate = () => {
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50) } catch (error) {
            console.error('Vibration API error:', error)
        }
    }

    const cancelLiveView = async () => {
        const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
        if (activeIds.length > 0) await supabase.from('scene_checklists').update({ is_active: false }).in('id', activeIds)
        clearLiveStorage()
        router.push('/')
    }

    const previousScene = () => {
        const currentIndex = sortedChecklists.findIndex(c => c.id === localActiveSceneId)
        if (currentIndex > 0) setLocalActiveSceneId(sortedChecklists[currentIndex - 1].id)
    }

    const togglePrepared = async (id: string, currentState: boolean | null) => {
        const newState = !currentState
        setItems(prev => prev.map(item => item.id === id ? { ...item, is_prepared: newState } : item))
        const { error } = await supabase.from('scene_checklist_items').update({ is_prepared: newState }).eq('id', id)
        if (error) setItems(prev => prev.map(item => item.id === id ? { ...item, is_prepared: currentState } : item))
    }



    const handleAssign = async (itemId: string, userId: string) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, assigned_to: userId } : item))
        await supabase.from('scene_checklist_items').update({ assigned_to: userId }).eq('id', itemId)
    }

    const stageAll = async () => {
        const unprep = currentSceneItems.filter(i => !i.is_prepared)
        if (unprep.length > 0) { setForceStageAllId(localActiveSceneId); return }
        setForceStageAllId(null)
        finishScene()
    }

    if (!isConfirmed) {
        return <LiveConfirmOverlay onConfirm={() => setIsConfirmed(true)} onBack={() => router.push('/')} t={t} />
    }

    if (showStats) {
        return <LiveStatsOverlay startTime={startTime} endTime={endTime} totalBreakTime={totalBreakTime} formatDuration={formatDuration} onExit={() => router.push('/')} t={t} />
    }

    return (
        <div className="fixed inset-0 z-100 flex flex-col bg-black text-white overflow-hidden">
            {connectionError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-200 w-[90%] max-w-md">
                    <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium flex-1">{connectionError}</p>
                        <button onClick={() => setConnectionError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <LivePerformanceSidebar sortedChecklists={sortedChecklists} items={items} localActiveSceneId={localActiveSceneId} setLocalActiveSceneId={setLocalActiveSceneId} t={t} />

                <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/50 backdrop-blur-3xl">
                    <LivePerformanceHeader currentChecklist={currentChecklist} now={now} startTime={startTime} totalBreakTime={totalBreakTime} isBreak={isBreak} breakStartTime={breakStartTime} formatDuration={formatDuration} t={t} />

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800/50">
                                <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block mb-1">{t('actTime')}</span>
                                <span className="text-xl font-mono text-white font-black">{formatDuration(now - actStartTime!)}</span>
                            </div>
                            <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800/50 flex flex-col justify-center">
                                <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block mb-1">{t('itemsOnStage')}</span>
                                <span className="text-xl font-mono text-green-400 font-black">{currentSceneItems.filter(i => i.is_prepared).length}/{currentSceneItems.length}</span>
                            </div>
                        </div>
                        {currentSceneItems.map(item => (
                            <LiveChecklistItem key={item.id} item={item} profiles={profiles} forceStageAll={forceStageAllId === localActiveSceneId} onTogglePrepared={togglePrepared} onAssign={handleAssign} onSafeVibrate={safeVibrate} />
                        ))}
                    </div>

                    <div className="p-4 md:p-6 border-t border-neutral-900/50 bg-black/40 backdrop-blur-md flex gap-4 shrink-0">
                        <button onClick={previousScene} className="flex-1 md:flex-none px-6 py-4 bg-neutral-900 text-neutral-400 font-bold rounded-2xl hover:bg-neutral-800 transition-all active:scale-95">{t('prev')}</button>
                        <button onClick={stageAll} className="flex-2 py-4 bg-burgundy-main text-white font-black rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(160,35,47,0.3)]">{t('stageAllBtn')}</button>
                        <button onClick={() => setShowCancelConfirmation(true)} className="flex-none p-4 bg-neutral-900 text-neutral-500 rounded-2xl hover:bg-neutral-800 transition-all active:scale-95"><X className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>

            {isBreak && <LiveBreakOverlay now={now} breakStartTime={breakStartTime} formatDuration={formatDuration} endBreak={endBreak} t={t} />}

            {showCancelConfirmation && (
                <div className="fixed inset-0 z-200 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-sm w-full">
                        <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">{t('cancelTitle')}</h2>
                        <p className="text-neutral-400 mb-8">{t('cancelDesc')}</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowCancelConfirmation(false)} className="flex-1 py-4 bg-neutral-800 text-white font-bold rounded-xl">{t('no')}</button>
                            <button onClick={cancelLiveView} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-xl">{t('yes')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
