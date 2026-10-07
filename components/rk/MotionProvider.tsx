'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { notify } from '@/utils/notify'
import {
    detectMotionLevel,
    readPreference,
    writePreference,
    readAutoLevel,
    writeAutoLevel,
    applyMotion,
    resolveMotionLevel,
    type MotionLevel,
    type MotionPreference,
} from '@/lib/motion'

interface MotionContextValue {
    preference: MotionPreference
    setPreference: (pref: MotionPreference) => void
    level: MotionLevel
}

const MotionContext = createContext<MotionContextValue | null>(null)

export function useMotionPreference(): MotionContextValue {
    const context = useContext(MotionContext)
    if (!context) {
        return {
            preference: 'auto',
            setPreference: () => {},
            level: 'full',
        }
    }
    return context
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
    const t = useTranslations('Motion')
    const [preference, setPreferenceState] = useState<MotionPreference>('auto')
    const [level, setLevelState] = useState<MotionLevel>('full')

    const preferenceRef = useRef<MotionPreference>('auto')
    preferenceRef.current = preference

    const monitoredRef = useRef<boolean>(false)

    // Przy montowaniu: odczytaj preferencję, ustal poziom i ustaw data-motion
    useEffect(() => {
        const initialPref = readPreference()
        const initialLevel = resolveMotionLevel(initialPref)
        setPreferenceState(initialPref)
        setLevelState(initialLevel)
        applyMotion(initialLevel)
    }, [])

    // Zmiana preferencji przez użytkownika
    const setPreference = useCallback((nextPref: MotionPreference) => {
        writePreference(nextPref)
        if (nextPref === 'auto') {
            // Przy ręcznym powrocie do 'auto' czyścimy ewentualny wcześniejszy spadek klatek
            writeAutoLevel(null)
        }
        const nextLevel = resolveMotionLevel(nextPref)
        setPreferenceState(nextPref)
        setLevelState(nextLevel)
        applyMotion(nextLevel)
    }, [])

    // Nasłuchiwanie systemowej zmiany prefers-reduced-motion
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        const handleChange = () => {
            if (preferenceRef.current === 'auto') {
                const nextLevel = detectMotionLevel()
                setLevelState(nextLevel)
                applyMotion(nextLevel)
            }
        }

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange)
        } else if (typeof (mediaQuery as any).addListener === 'function') {
            (mediaQuery as any).addListener(handleChange)
        }

        return () => {
            if (typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', handleChange)
            } else if (typeof (mediaQuery as any).removeListener === 'function') {
                (mediaQuery as any).removeListener(handleChange)
            }
        }
    }, [])

    // Lekki monitor klatek: przez pierwsze 3 sekundy po uruchomieniu mierz requestAnimationFrame
    useEffect(() => {
        if (typeof window === 'undefined' || monitoredRef.current) return
        monitoredRef.current = true

        // Jeśli urządzenie ma już zapisany automatyczny spadek do 'lite', nie ma potrzeby ponownego testowania
        if (readAutoLevel() === 'lite') return

        const initialPref = readPreference()
        // Jeśli preferencja nie jest 'auto' lub poziom to już 'lite', nie uruchamiaj monitora
        if (initialPref !== 'auto' || resolveMotionLevel(initialPref) === 'lite') return

        const deltas: number[] = []
        let evaluated = false
        let lastTime = performance.now()
        const startTime = lastTime
        let rafId: number | null = null

        const evaluateFps = () => {
            // Ocena tylko raz: wołają ją i ostatnia klatka, i awaryjny timer.
            if (evaluated) return
            evaluated = true
            if (deltas.length < 15) return

            const sorted = [...deltas].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            const median = sorted.length % 2 !== 0
                ? sorted[mid]
                : (sorted[mid - 1] + sorted[mid]) / 2

            // Mediana odstępu klatek > 50 ms (poniżej ok. 20 fps)
            if (median > 50 && preferenceRef.current === 'auto') {
                applyMotion('lite')
                setLevelState('lite')
                writeAutoLevel('lite')

                notify.info(t('downgradedToast'))
            }
        }

        const onFrame = (now: number) => {
            const delta = now - lastTime
            lastTime = now

            if (delta > 0 && delta < 1000 && !document.hidden) {
                deltas.push(delta)
            }

            if (now - startTime < 3000) {
                rafId = requestAnimationFrame(onFrame)
            } else {
                evaluateFps()
            }
        }

        rafId = requestAnimationFrame(onFrame)

        const timerId = setTimeout(() => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId)
                rafId = null
            }
            evaluateFps()
        }, 3200)

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId)
            clearTimeout(timerId)
            // Tryb deweloperski React uruchamia efekt dwa razy: pozwól monitorowi wystartować ponownie.
            monitoredRef.current = false
        }
    }, [t])

    return (
        <MotionContext.Provider value={{ preference, setPreference, level }}>
            {children}
        </MotionContext.Provider>
    )
}
