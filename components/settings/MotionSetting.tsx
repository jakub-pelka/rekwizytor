'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useMotionPreference } from '@/components/rk/MotionProvider'
import type { MotionPreference } from '@/lib/motion'

/**
 * Kontrolka wyboru poziomu ruchu dla Ustawień.
 * Klasy .rk-fieldset, .rk-check, .rk-dot zgodne z kartą Controls design systemu.
 */
export function MotionSetting() {
    const t = useTranslations('Motion')
    const { preference, setPreference } = useMotionPreference()

    const getTranslation = (key: string) => t(key)

    const options: Array<{ value: MotionPreference; label: string; hint: string }> = [
        {
            value: 'full',
            label: getTranslation('full'),
            hint: getTranslation('fullHint'),
        },
        {
            value: 'lite',
            label: getTranslation('lite'),
            hint: getTranslation('liteHint'),
        },
        {
            value: 'auto',
            label: getTranslation('auto'),
            hint: getTranslation('autoHint'),
        },
    ]

    return (
        <fieldset className="rk-fieldset">
            <legend>{getTranslation('title')}</legend>
            <p className="rk-hint" style={{ marginTop: '-4px', marginBottom: 'var(--space-2)' }}>
                {getTranslation('description')}
            </p>
            {options.map((opt) => (
                <label key={opt.value} className="rk-check">
                    <input
                        type="radio"
                        name="rk-motion-setting"
                        value={opt.value}
                        checked={preference === opt.value}
                        onChange={() => setPreference(opt.value)}
                    />
                    <span className="rk-dot" aria-hidden="true" />
                    <span>
                        {opt.label}
                        <small>{opt.hint}</small>
                    </span>
                </label>
            ))}
        </fieldset>
    )
}
