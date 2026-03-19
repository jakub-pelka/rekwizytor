'use client'

import React, { useState } from 'react'
import { useTour } from '@/hooks/useTour'
import { TOURS } from '@/utils/constants/tours'
import { Button } from '@/components/ui/Button'
import { Power, RotateCcw, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ToursManager() {
    const {
        areToursEnabled,
        setToursEnabled,
        resetAllTours,
        resetTour,
        isTourCompleted
    } = useTour()

    // We can use generic translations for now or add specific ones
    // For now I'll use hardcoded Polish as requested, assuming the user speaks Polish based on context

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            {/* Header Section */}
            <div className="border-b border-zinc-800 pb-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Zarządzanie Podpowiedziami</h1>
                        <p className="text-zinc-400">
                            Włącz lub wyłącz system podpowiedzi oraz przeglądaj instrukcje.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setToursEnabled(!areToursEnabled)}
                            variant={areToursEnabled ? "outline" : "destructive"}
                            className="gap-2"
                        >
                            <Power size={16} />
                            {areToursEnabled ? 'Podpowiedzi Włączone' : 'Podpowiedzi Wyłączone'}
                        </Button>
                        <Button onClick={resetAllTours} variant="secondary" className="gap-2">
                            <RotateCcw size={16} />
                            Zresetuj Historię
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tours List / Guidebook */}
            <div className="space-y-6">
                {Object.values(TOURS).map((tour) => (
                    <TourGuideCard
                        key={tour.id}
                        tour={tour}
                        isCompleted={isTourCompleted(tour.id)}
                        onReset={() => resetTour(tour.id)}
                    />
                ))}
            </div>
        </div>
    )
}

function TourGuideCard({ tour, isCompleted, onReset }: { readonly tour: any, readonly isCompleted: boolean, readonly onReset: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all hover:border-zinc-700">
            <div
                className="p-6 cursor-pointer flex items-start justify-between gap-4"
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsExpanded(!isExpanded)
                    }
                }}
                role="button"
                tabIndex={0}
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-zinc-100">{tour.title}</h3>
                        {isCompleted ? (
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={10} /> Zapoznano
                            </span>
                        ) : (
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Info size={10} /> Do przeczytania
                            </span>
                        )}
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{tour.description}</p>
                </div>
                <div className="text-zinc-500">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20"
                    >
                        <div className="p-6 pt-0 border-t border-zinc-800/50">
                            <div className="mt-6 grid gap-6 md:grid-cols-2">
                                {tour.steps.map((step: any, idx: number) => (
                                    <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold font-mono">
                                                {idx + 1}
                                            </span>
                                            <h4 className="font-medium text-zinc-200">{step.title}</h4>
                                        </div>
                                        <p className="text-sm text-zinc-400 ml-8 leading-relaxed">
                                            {step.content}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end gap-2 border-t border-zinc-800/50 pt-4">
                                {isCompleted && (
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onReset(); }}>
                                        <RotateCcw size={14} className="mr-2" />
                                        Oznacz jako nieprzeczytane
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
