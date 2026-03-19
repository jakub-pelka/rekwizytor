'use client'

import React from 'react'
import { Clock } from 'lucide-react'

type Props = {
    readonly onConfirm: () => void
    readonly onBack: () => void
    readonly t: (key: string, params?: any) => string
}

export function LiveConfirmOverlay({ onConfirm, onBack, t }: Props) {
    return (
        <div className="fixed inset-0 z-100 bg-black flex items-center justify-center p-6 text-center">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full">
                <Clock className="w-16 h-16 text-burgundy-main mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">{t('confirmStartTitle')}</h2>
                <p className="text-neutral-400 mb-8">{t('confirmStartDesc')}</p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-4 bg-burgundy-main text-white font-bold rounded-xl hover:bg-burgundy-dark transition-all"
                    >
                        {t('confirmStartBtn')}
                    </button>
                    <button
                        onClick={onBack}
                        className="w-full py-4 bg-neutral-800 text-neutral-400 font-medium rounded-xl hover:bg-neutral-700 transition-all"
                    >
                        {t('back')}
                    </button>
                </div>
            </div>
        </div>
    )
}
