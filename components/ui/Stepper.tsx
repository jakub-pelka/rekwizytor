import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = {
    id?: number
    label: string
    description?: string
}

interface StepperProps {
    readonly steps: Step[]
    readonly currentStep: number
    readonly onStepClick?: (step: number) => void
    readonly className?: string
    readonly color?: string | null
}

export function Stepper({ steps, currentStep, onStepClick, className, color }: StepperProps) {
    return (
        <div className={cn("flex flex-col md:flex-row gap-4 md:items-center", className)}>
            {steps.map((step, index) => {
                const stepNum = index + 1
                const isActive = stepNum === currentStep
                const isCompleted = stepNum < currentStep

                return (
                    <div
                        key={step.label}
                        className={cn(
                            "flex items-center gap-3",
                            onStepClick && "cursor-pointer group"
                        )}
                        onClick={() => onStepClick?.(stepNum)}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && onStepClick) {
                                e.preventDefault()
                                onStepClick(stepNum)
                            }
                        }}
                        role={onStepClick ? "button" : undefined}
                        tabIndex={onStepClick ? 0 : undefined}
                    >
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors",
                                (() => {
                                    if (isActive && !color) return "bg-white text-black border-white"
                                    if (isCompleted && !color) return "bg-green-500 text-white border-green-500"
                                    if (!isActive && !isCompleted) return "bg-transparent text-neutral-500 border-neutral-700 group-hover:border-neutral-500"
                                    return ""
                                })()
                            )}
                            style={(() => {
                                if (!color) return undefined
                                if (isActive || isCompleted) {
                                    return {
                                        backgroundColor: color,
                                        borderColor: color,
                                        color: 'white'
                                    }
                                }
                                return undefined
                            })()}
                        >
                            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                        </div>

                        <div className="flex flex-col">
                            <span className={cn(
                                "text-sm font-medium transition-colors",
                                isActive || isCompleted ? "text-white" : "text-neutral-500 group-hover:text-neutral-400"
                            )}>
                                {step.label}
                            </span>
                            {step.description && (
                                <span className="text-[10px] text-neutral-600 hidden md:block">
                                    {step.description}
                                </span>
                            )}
                        </div>

                        {/* Connector Line (except for last item) */}
                        {index < steps.length - 1 && (
                            <div className="hidden md:block w-12 h-px bg-neutral-800 mx-2" />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
