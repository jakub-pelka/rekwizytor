'use client'

import { useState, useEffect } from 'react'

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

export function useLivePerformanceTimer(
    performanceId: string,
    isConfirmed: boolean,
    currentChecklist: Checklist | undefined
) {
    const [now, setNow] = useState<number>(Date.now())
    const [startTime, setStartTime] = useState<number | null>(null)
    const [actStartTime, setActStartTime] = useState<number | null>(null)
    const [endTime, setEndTime] = useState<number | null>(null)
    const [isBreak, setIsBreak] = useState(false)
    const [breakStartTime, setBreakStartTime] = useState<number | null>(null)
    const [totalBreakTime, setTotalBreakTime] = useState(0)

    // Load state from localStorage
    useEffect(() => {
        const storedStart = localStorage.getItem(`live_view_start_${performanceId}`)
        if (storedStart) setStartTime(Number.parseInt(storedStart))

        const storedIsBreak = localStorage.getItem(`live_view_is_break_${performanceId}`)
        if (storedIsBreak === 'true') setIsBreak(true)

        const storedBreakStart = localStorage.getItem(`live_view_break_start_${performanceId}`)
        if (storedBreakStart) setBreakStartTime(Number.parseInt(storedBreakStart))

        const storedTotalBreak = localStorage.getItem(`live_view_total_break_${performanceId}`)
        if (storedTotalBreak) setTotalBreakTime(Number.parseInt(storedTotalBreak))

        const storedEnd = localStorage.getItem(`live_view_end_${performanceId}`)
        if (storedEnd) setEndTime(Number.parseInt(storedEnd))
    }, [performanceId])

    // Global timer tick
    useEffect(() => {
        if (!isConfirmed) return
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 1000)
        return () => clearInterval(interval)
    }, [isConfirmed])

    // Act timer logic
    useEffect(() => {
        if (!isConfirmed || !currentChecklist || isBreak) return
        const actKey = `live_view_act_start_${performanceId}_${currentChecklist.act_number}`
        const storedActStart = localStorage.getItem(actKey)
        if (storedActStart) {
            setActStartTime(Number.parseInt(storedActStart))
        } else {
            const newActStart = Date.now()
            setActStartTime(newActStart)
            localStorage.setItem(actKey, newActStart.toString())
        }
    }, [isConfirmed, currentChecklist?.act_number, performanceId, isBreak])

    const clearLiveStorage = () => {
        localStorage.removeItem(`live_view_start_${performanceId}`)
        localStorage.removeItem(`live_view_is_break_${performanceId}`)
        localStorage.removeItem(`live_view_break_start_${performanceId}`)
        localStorage.removeItem(`live_view_total_break_${performanceId}`)
        localStorage.removeItem(`live_view_end_${performanceId}`)
        // Clear all act keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`live_view_act_start_${performanceId}_`)) {
                localStorage.removeItem(key)
            }
        })
    }

    const formatDuration = (ms: number) => {
        if (ms < 0) ms = 0
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor(ms / (1000 * 60 * 60))
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return {
        now,
        startTime,
        setStartTime,
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
    }
}
