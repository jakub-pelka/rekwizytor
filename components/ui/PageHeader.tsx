'use client'

import React from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

interface PageHeaderProps {
    readonly title: string
    readonly subtitle?: string
    readonly icon?: React.ReactNode
    readonly className?: string
    readonly children?: React.ReactNode // For actions/buttons
    readonly iconColor?: string
    readonly backLink?: string
}

export function PageHeader({
    title,
    subtitle,
    icon,
    className,
    children,
    iconColor = "text-white",
    backLink
}: PageHeaderProps) {
    return (
        <div className={clsx("flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 mb-6", className)}>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex items-start gap-3 md:gap-4"
            >
                {icon && (
                    <div className={clsx("mt-1 p-2 rounded-xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm shadow-xl", iconColor)}>
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h1>
                    {subtitle && <p className="text-neutral-400 mt-1 max-w-2xl text-sm md:text-base leading-relaxed">{subtitle}</p>}
                </div>
            </motion.div>

            {children && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-wrap items-center gap-3 mt-4 md:mt-0 w-full md:w-auto"
                >
                    {children}
                </motion.div>
            )}
        </div>
    )
}
