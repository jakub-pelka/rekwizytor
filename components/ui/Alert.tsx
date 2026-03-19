import React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps {
    readonly children: React.ReactNode
    readonly className?: string
}

interface AlertDescriptionProps {
    readonly children: React.ReactNode
    readonly className?: string
}

export function Alert({ children, className }: AlertProps) {
    return (
        <div className={cn(
            'rounded-lg border border-gray-700 bg-gray-800/50 p-4',
            className
        )}>
            {children}
        </div>
    )
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
    return (
        <div className={cn('text-sm text-gray-300', className)}>
            {children}
        </div>
    )
}
