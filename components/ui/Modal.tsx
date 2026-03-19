'use client'

import { ReactNode } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: ReactNode
    description?: ReactNode
    children: ReactNode
    className?: string
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
    maxWidth = 'lg'
}: ModalProps) {
    const maxWidthClasses = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl'
    }

    return (
        <Transition show={isOpen}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 transition-opacity backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <TransitionChild
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel
                                className={cn(
                                    "relative transform overflow-hidden rounded-xl bg-[#1a1a1a] px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:p-6 border border-neutral-800 w-full",
                                    maxWidthClasses[maxWidth],
                                    className
                                )}
                            >
                                <div className="absolute right-4 top-4 z-10">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-full"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                        <span className="sr-only">Close</span>
                                    </Button>
                                </div>

                                {(title || description) && (
                                    <div className="mb-6 text-center sm:text-left pr-8">
                                        {title && (
                                            <DialogTitle as="h3" className="text-lg font-bold leading-6 text-white tracking-tight">
                                                {title}
                                            </DialogTitle>
                                        )}
                                        {description && (
                                            <div className="mt-2">
                                                <p className="text-sm text-neutral-400">
                                                    {description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {children}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
