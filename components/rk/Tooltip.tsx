'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

// Podpowiedź (karta Tooltip, `.rk-tip`): po najechaniu myszą albo fokusie klawiatury, po 400 ms, znika od razu.
// Jedno krótkie zdanie, opcjonalnie ze skrótem (`kbd`). Na dotyk jej nie ma, więc nie niesie jedynej informacji.
export function Tooltip({ text, keys, side = 'bottom', children }: {
    text: string
    keys?: string
    side?: 'top' | 'bottom' | 'right'
    children: ReactNode
}) {
    const id = useId()
    const [open, setOpen] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const show = () => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setOpen(true), 400)
    }
    const hide = () => {
        if (timer.current) clearTimeout(timer.current)
        setOpen(false)
    }
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

    return (
        <span
            className="rk-tip-wrap w-full"
            onMouseEnter={show}
            onMouseLeave={hide}
            // Fokus pokazuje podpowiedź tylko wtedy, gdy przeglądarka uznaje go za klawiaturowy.
            onFocus={e => { if (e.target.matches(':focus-visible')) show() }}
            onBlur={hide}
            onKeyDown={e => { if (e.key === 'Escape') hide() }}
            aria-describedby={open ? id : undefined}
        >
            {children}
            {open && (
                <span className={`rk-tip rk-tip--${side}`} role="tooltip" id={id}>
                    {text}{keys && <kbd>{keys}</kbd>}
                </span>
            )}
        </span>
    )
}
