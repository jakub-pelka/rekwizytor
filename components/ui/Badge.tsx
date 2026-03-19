import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
    readonly children: React.ReactNode
    readonly variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    readonly className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variantStyles = {
        default: 'bg-blue-600 text-white',
        secondary: 'bg-gray-700 text-gray-200',
        destructive: 'bg-red-600 text-white',
        outline: 'border border-gray-600 text-gray-300'
    }

    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            variantStyles[variant],
            className
        )}>
            {children}
        </span>
    )
}
