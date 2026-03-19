import React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    className?: string
}

export function Textarea({ className, ...props }: Readonly<TextareaProps>) {
    return (
        <textarea
            className={cn(
                "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-gray-500",
                "min-h-[80px]",
                className
            )}
            {...props}
        />
    )
}
