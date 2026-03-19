import React from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string
    children: React.ReactNode
}

export function Label({ className, children, ...props }: Readonly<LabelProps>) {
    return (
        <label
            className={cn(
                "block text-sm font-medium text-gray-300 mb-2",
                className
            )}
            {...props}
        >
            {children}
        </label>
    )
}
