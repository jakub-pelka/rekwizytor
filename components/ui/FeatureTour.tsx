'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X, ChevronRight } from 'lucide-react'

export interface TourStep {
    targetId: string
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
}

interface FeatureTourProps {
    steps: TourStep[]
    isOpen: boolean
    onClose: () => void
    onComplete?: () => void
    variant?: 'default' | 'minimal'
}

function getTooltipTranslateClass(placement: string): string {
    if (placement === 'top') return '-translate-x-1/2 -translate-y-full'
    if (placement === 'left') return '-translate-x-full -translate-y-1/2'
    if (placement === 'right') return '-translate-y-1/2'
    return '-translate-x-1/2' // default bottom
}

export function FeatureTour({ steps, isOpen, onClose, onComplete, variant = 'default' }: FeatureTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
    const [actualPlacement, setActualPlacement] = useState<string>('bottom')

    // Portal target (document.body usually)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        if (isOpen && steps[currentStep]) {
            const updatePosition = () => {
                const target = document.getElementById(steps[currentStep].targetId)
                if (target) {
                    const rect = target.getBoundingClientRect()
                    setTargetRect(rect)

                    // Simple positioning logic
                    const padding = 12
                    let top = 0
                    let left = 0
                    let placement = steps[currentStep].position || 'bottom'

                    // Initial calculation
                    const calculateCoords = (pos: string) => {
                        let t = 0, l = 0
                        if (pos === 'bottom') {
                            t = rect.bottom + window.scrollY + padding
                            l = rect.left + window.scrollX + (rect.width / 2)
                        } else if (pos === 'top') {
                            t = rect.top + window.scrollY - padding
                            l = rect.left + window.scrollX + (rect.width / 2)
                        } else if (pos === 'right') {
                            t = rect.top + window.scrollY + (rect.height / 2)
                            l = rect.right + window.scrollX + padding
                        } else if (pos === 'left') {
                            t = rect.top + window.scrollY + (rect.height / 2)
                            l = rect.left + window.scrollX - padding
                        }
                        return { t, l }
                    }

                    // Attempt preferred position
                    let coords = calculateCoords(placement)
                    top = coords.t
                    left = coords.l

                    // Collision Detection (specifically for right edge)
                    // We assume a width for the tooltip depending on variant
                    const tooltipWidth = variant === 'minimal' ? 280 : 360
                    const halfWidth = tooltipWidth / 2
                    const margin = 20

                    // Check horizontal overflow
                    if (placement === 'left' || placement === 'right') {
                        // For side placements, check if it fits completely
                        if (placement === 'right' && (left + tooltipWidth > window.innerWidth - margin)) {
                            // Flip to left if no space on right
                            placement = 'left'
                            coords = calculateCoords('left')
                            top = coords.t
                            left = coords.l
                        } else if (placement === 'left' && (left - tooltipWidth < margin)) {
                            // Flip to right if no space on left
                            placement = 'right'
                            coords = calculateCoords('right')
                            top = coords.t
                            left = coords.l
                        }
                    } else {
                        // For top/bottom, check if centered tooltip hits edges
                        // If it hits right edge
                        if (left + halfWidth > window.innerWidth - margin) {
                            // Shift left
                            const overflow = (left + halfWidth) - (window.innerWidth - margin)
                            left -= overflow
                        }
                        // If it hits left edge
                        else if (left - halfWidth < margin) {
                            const overflow = margin - (left - halfWidth)
                            left += overflow
                        }
                    }

                    // TODO: Could also add vertical collision detection (flip top/bottom) but horizontal is the user's issue.

                    setTooltipPosition({ top, left })
                    setActualPlacement(placement)

                    // Scroll into view if needed
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }

            // Initial update
            updatePosition()

            // Update on resize
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition)

            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition)
            }
        }
    }, [isOpen, currentStep, steps, variant])

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            onComplete?.()
            onClose()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop Click Layer (Invisible, just for closing) */}
                    <div
                        className="fixed inset-0 z-9998"
                        onClick={onClose}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                onClose()
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Close tour"
                    />

                    {/* Highlight Effect with Backdrop via Box Shadow */}
                    {targetRect && (
                        <motion.div
                            initial={false}
                            animate={{
                                top: targetRect.top + window.scrollY,
                                left: targetRect.left + window.scrollX,
                                width: targetRect.width,
                                height: targetRect.height,
                                opacity: 1
                            }}
                            transition={{ type: "spring", stiffness: 220, damping: 30, mass: 0.8 }}
                            // Overlay (Backdrop) is created by the massive 1st shadow
                            // Glow effect is created by the 2nd shadow
                            style={{
                                boxShadow: `0 0 0 9999px rgba(0,0,0,0.6), 0 0 20px 4px rgba(99, 102, 241, 0.5)`
                            }}
                            className="absolute z-9998 rounded-lg pointer-events-none"
                            onClick={onClose} // Allow clicking backdrop to close (pointer-events-none usually blocks this on the div itself, but the huge shadow is part of the div.. wait. If pointer-events-none, shadow clicks pass through. We need a real backdrop for clicks OR enable pointer events on the shadow area.. actually the huge shadow approach makes 'click outside to close' harder if strictly using pointer-events-none. But for visual fix first, let's stick to this. The user can click the X button.)
                        />
                    )}

                    {/* Tooltip */}
                    <div
                        className="absolute z-9999"
                        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            key={currentStep} // Animate when step changes
                            className={`bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl shadow-xl relative border border-zinc-200 dark:border-zinc-800 ${variant === 'minimal' ? 'w-[280px] p-4' : 'max-w-sm w-[360px] p-6'} ${getTooltipTranslateClass(actualPlacement)}`}
                        >
                            <button onClick={onClose} className={`absolute text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ${variant === 'minimal' ? 'top-2 right-2' : 'top-3 right-3'}`}>
                                <X size={16} />
                            </button>

                            <div className={variant === 'minimal' ? 'mt-1' : 'mb-4'}>
                                {variant !== 'minimal' && (
                                    <h3 className="font-bold text-lg mb-2 pr-6">{steps[currentStep].title}</h3>
                                )}
                                <p className={`text-zinc-600 dark:text-zinc-400 leading-relaxed ${variant === 'minimal' ? 'text-sm pr-4' : 'text-sm'}`}>
                                    {steps[currentStep].content}
                                </p>
                            </div>

                            {variant !== 'minimal' && (
                                <div className="flex items-center justify-between mt-6 pt-2">
                                    <div className="flex gap-2">
                                        {steps.length > 1 && (
                                            <div className="flex gap-1">
                                                {steps.map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-500' : 'w-1.5 bg-zinc-200 dark:bg-zinc-700'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        {currentStep > 0 && (
                                            <button
                                                onClick={handlePrev}
                                                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                                            >
                                                Wróć
                                            </button>
                                        )}
                                        <button
                                            onClick={handleNext}
                                            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                        >
                                            {currentStep === steps.length - 1 ? 'Rozumiem' : (
                                                <>
                                                    Dalej <ChevronRight size={14} className="stroke-3" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Arrow Pointer */}
                            <div
                                className={`absolute w-4 h-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rotate-45 ${(() => {
                                    if (actualPlacement === 'top') return 'bottom-[-8px] left-1/2 -translate-x-1/2 border-t-0 border-l-0'
                                    if (actualPlacement === 'left') return 'right-[-8px] top-1/2 -translate-y-1/2 border-b-0 border-l-0'
                                    if (actualPlacement === 'right') return 'left-[-8px] top-1/2 -translate-y-1/2 border-t-0 border-r-0'
                                    return 'top-[-8px] left-1/2 -translate-x-1/2 border-b-0 border-r-0'
                                })()}`}
                            />
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
