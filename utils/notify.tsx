import toast from 'react-hot-toast'
import React from 'react'
import { Info, FileText, FileSpreadsheet, Download, Save } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Unified notification system using react-hot-toast
 * Wraps toast calls with consistent styling and behavior
 */

const BASE_STYLE = "!bg-neutral-800 !text-white !border !shadow-xl !rounded-lg !font-medium !text-sm"

const YellowPulseDot = () => <div className="animate-pulse-yellow h-2.5 w-2.5 rounded-full" />
const BluePulseDot = () => <div className="animate-pulse-blue h-2.5 w-2.5 rounded-full" />
const InfoIcon = () => <Info className="w-4 h-4 text-blue-400 animate-info-bob" />

/**
 * Custom wrapper for toasts to support swipe-to-dismiss
 */
const ToastWrapper = ({ t, message, icon, className }: { t: any, message: string, icon: React.ReactNode, className: string }) => {
    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: -10, right: 300 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
                // If dragged more than 100px to the right, dismiss
                if (info.offset.x > 100 || info.offset.x < -100) {
                    toast.dismiss(t.id)
                }
            }}
            whileTap={{ scale: 0.98 }}
            className={`${className} flex items-center min-w-[300px] max-w-md p-3 cursor-grab active:cursor-grabbing pointer-events-auto`}
        >
            <div className="flex items-center gap-3 w-full">
                {icon && (
                    <div className="shrink-0 flex items-center justify-center min-w-[20px]">
                        {icon}
                    </div>
                )}
                <div className="grow text-sm">{message}</div>
            </div>
        </motion.div>
    )
}

// Internal icons for success/error to match TOAST_OPTIONS structure
const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
const XIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const TOAST_OPTIONS = {
    className: BASE_STYLE,
    style: {
        background: '#262626', // neutral-800
        color: '#ffffff',
    },
    success: {
        className: `${BASE_STYLE} !border-emerald-500/50`,
        iconTheme: {
            primary: '#10b981', // emerald-500
            secondary: '#ffffff',
        },
        icon: <div className="p-1 bg-emerald-500 rounded-full text-white"><CheckIcon /></div>
    },
    error: {
        className: `${BASE_STYLE} !border-red-500/50 animate-toast-shake`,
        iconTheme: {
            primary: '#ef4444', // red-500
            secondary: '#ffffff',
        },
        icon: <div className="p-1 bg-red-500 rounded-full text-white"><XIcon /></div>
    },
    loading: {
        className: `${BASE_STYLE} !border-yellow-500/50`,
        icon: <YellowPulseDot />,
    },
    info: {
        className: `${BASE_STYLE} !border-blue-500/50`,
        icon: <InfoIcon />,
    }
}

export const notify = {
    /**
     * Show a success toast
     */
    success: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={TOAST_OPTIONS.success.icon}
                className={TOAST_OPTIONS.success.className}
            />
        ), { id, duration: 3000 })
    },

    /**
     * Show an error toast
     */
    error: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={TOAST_OPTIONS.error.icon}
                className={TOAST_OPTIONS.error.className}
            />
        ), { id, duration: 5000 })
    },

    /**
     * Specialized finish states with corresponding icons
     */
    successPDF: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={<div className="p-1 bg-neutral-700 rounded-lg text-red-500"><FileText className="w-4 h-4" /></div>}
                className={`${BASE_STYLE} border-emerald-500/50!`}
            />
        ), { id, duration: 4000 })
    },

    successExcel: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={<div className="p-1 bg-neutral-700 rounded-lg text-green-500"><FileSpreadsheet className="w-4 h-4" /></div>}
                className={`${BASE_STYLE} border-emerald-500/50!`}
            />
        ), { id, duration: 4000 })
    },

    successDownload: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={<div className="p-1 bg-neutral-700 rounded-lg text-blue-400"><Download className="w-4 h-4" /></div>}
                className={`${BASE_STYLE} border-emerald-500/50!`}
            />
        ), { id, duration: 4000 })
    },

    successSaving: (message: string, id?: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={<div className="p-1 bg-neutral-700 rounded-lg text-emerald-400"><Save className="w-4 h-4" /></div>}
                className={`${BASE_STYLE} border-emerald-500/50!`}
            />
        ), { id, duration: 3000 })
    },

    /**
     * Specialized loading states
     */
    pdf: (message: string) => notify.loading(message, true),
    saving: (message: string) => notify.loading(message),
    download: (message: string) => notify.loading(message, true),
    excel: (message: string) => notify.loading(message, true),
    export: (message: string) => notify.loading(message, true),
    processing: (message: string) => notify.loading(message),

    /**
     * Show a loading toast
     * Returns the toast ID which can be used to dismiss it later
     */
    loading: (message: string, isBlue: boolean = false) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={isBlue ? <BluePulseDot /> : <YellowPulseDot />}
                className={isBlue ? `${BASE_STYLE} border-blue-500/50!` : TOAST_OPTIONS.loading.className}
            />
        ), { id: typeof message === 'string' ? message : undefined })
    },

    /**
     * Dismiss a specific toast by ID
     */
    dismiss: (toastId: string) => {
        toast.dismiss(toastId)
    },

    /**
     * Dismiss all toasts
     */
    dismissAll: () => {
        toast.dismiss()
    },

    /**
     * Show a promise-based toast
     * Automatically shows loading, success, or error based on promise state
     */
    promise: <T extends unknown>(
        promise: Promise<T>,
        messages: {
            loading: string
            success: string
            error: string | ((err: any) => string)
        },
        type?: 'pdf' | 'excel' | 'download' | 'saving'
    ) => {
        const id = type === 'pdf' || type === 'excel' || type === 'download'
            ? notify.loading(messages.loading, true)
            : notify.loading(messages.loading)

        promise.then(
            () => {
                if (type === 'pdf') notify.successPDF(messages.success, id)
                else if (type === 'excel') notify.successExcel(messages.success, id)
                else if (type === 'download') notify.successDownload(messages.success, id)
                else if (type === 'saving') notify.successSaving(messages.success, id)
                else notify.success(messages.success, id)
            },
            (err) => {
                const msg = typeof messages.error === 'function' ? messages.error(err) : messages.error
                notify.error(msg, id)
            }
        )

        return promise
    },

    /**
     * Show a simple custom toast (info)
     */
    info: (message: string) => {
        return toast.custom((t) => (
            <ToastWrapper
                t={t}
                message={message}
                icon={TOAST_OPTIONS.info.icon}
                className={TOAST_OPTIONS.info.className}
            />
        ), { duration: 4000 })
    }
}
