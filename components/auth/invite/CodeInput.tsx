'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { CODE_LENGTH } from './types'

interface CodeInputProps {
    /** Same cyfry, do 6 znaków. */
    value: string
    onChange: (digits: string) => void
    invalid?: boolean
    disabled?: boolean
    autoFocus?: boolean
    /** Wywoływane Enterem w którejkolwiek komórce. */
    onSubmit?: () => void
}

const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, CODE_LENGTH)

/**
 * Kod z zaproszenia: sześć komórek w dwóch grupach po trzy (.kd-code / .kd-grp / .kd-d).
 * Wklejenie „482 913”, „482-913” albo „482913” wypełnia całość, także z podpowiedzi SMS (one-time-code).
 */
export function CodeInput({ value, onChange, invalid, disabled, autoFocus, onSubmit }: CodeInputProps) {
    const t = useTranslations('Welcome')
    const refs = useRef<Array<HTMLInputElement | null>>([])

    useEffect(() => {
        if (autoFocus && !disabled) refs.current[0]?.focus()
    }, [autoFocus, disabled])

    const focusCell = (i: number) => {
        const el = refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]
        el?.focus()
        el?.select()
    }

    // Wpisanie lub wklejenie ciągu cyfr od komórki `from`; reszta kodu zostaje.
    const put = (from: number, raw: string) => {
        let digits = raw.replace(/\D/g, '')
        // Cyfra dopisana do już wypełnionej komórki (kursor bez zaznaczenia): bierzemy nową.
        if (digits.length === 2 && value[from] && digits.includes(value[from])) {
            digits = digits.replace(value[from], '')
        }
        if (!digits) return
        // Kilka cyfr naraz (wklejenie, autouzupełnienie) to zawsze cały kod od początku.
        if (digits.length > 1) {
            const full = digits.slice(0, CODE_LENGTH)
            onChange(full)
            focusCell(Math.min(full.length, CODE_LENGTH - 1))
            return
        }
        const at = Math.min(from, value.length)
        onChange(value.slice(0, at) + digits + value.slice(at + 1))
        focusCell(at + 1)
    }

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault()
            if (value[i]) {
                onChange(value.slice(0, i) + value.slice(i + 1))
            } else if (i > 0) {
                onChange(value.slice(0, i - 1) + value.slice(i))
                focusCell(i - 1)
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            focusCell(i - 1)
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            focusCell(i + 1)
        } else if (e.key === 'Enter') {
            onSubmit?.()
        }
    }

    const cell = (i: number) => (
        <input
            key={i}
            ref={el => { refs.current[i] = el }}
            className={`rk-input kd-d${invalid ? ' rk-input--error' : ''}`}
            value={value[i] ?? ''}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            aria-label={t('codeDigit', { n: i + 1, total: CODE_LENGTH })}
            aria-invalid={invalid ? true : undefined}
            disabled={disabled}
            onFocus={e => e.currentTarget.select()}
            onChange={e => put(i, e.target.value)}
            onPaste={e => {
                e.preventDefault()
                put(i, onlyDigits(e.clipboardData.getData('text')))
            }}
            onKeyDown={e => handleKeyDown(i, e)}
        />
    )

    return (
        <div className="kd-code" role="group" aria-label={t('codeGroup')}>
            <div className="kd-grp">{[0, 1, 2].map(cell)}</div>
            <div className="kd-grp">{[3, 4, 5].map(cell)}</div>
        </div>
    )
}
