import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string
}

export function Input({ className, ...props }: Readonly<InputProps>) {
    return (
        <input
            className={cn(
                "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-gray-500",
                className
            )}
            {...props}
        />
    )
}
