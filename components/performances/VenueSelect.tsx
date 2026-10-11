'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const OTHER = '__other__'

type Props = {
    value: string
    onChange: (value: string) => void
    venues: string[]
    label: string
    noneLabel: string
    otherLabel: string
    placeholder: string
}

// Scena do wyboru z tych, które już grają w pracowni. Nową wpisuje się dopiero po wybraniu „Inna scena…”.
export function VenueSelect({ value, onChange, venues, label, noneLabel, otherLabel, placeholder }: Props) {
    const known = value === '' || venues.includes(value)
    const [custom, setCustom] = useState(!known)

    return (
        <div className="rk-field">
            <label className="rk-label" htmlFor="venue-select">{label}</label>
            <span className="rk-select">
                <select
                    id="venue-select"
                    value={custom ? OTHER : value}
                    onChange={e => {
                        if (e.target.value === OTHER) {
                            setCustom(true)
                            onChange('')
                        } else {
                            setCustom(false)
                            onChange(e.target.value)
                        }
                    }}
                >
                    <option value="">{noneLabel}</option>
                    {venues.map(v => <option key={v} value={v}>{v}</option>)}
                    <option value={OTHER}>{otherLabel}</option>
                </select>
                <ChevronDown className="w-4 h-4" />
            </span>
            {custom && (
                <input
                    type="text"
                    className="rk-input"
                    autoFocus
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={label}
                />
            )}
        </div>
    )
}
