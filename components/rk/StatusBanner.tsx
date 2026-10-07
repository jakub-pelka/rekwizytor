import type { ReactNode } from 'react'

// Pasek stanu pod nagłówkiem (karta StatusBanner, .rk-banner). Jeden pasek naraz, treść jednym zdaniem.
// Kolejność ważności: offline > tylko do odczytu > oczekujący.
export function StatusBanner({
    tone, icon, children, side,
}: {
    tone: 'offline' | 'sync' | 'ok' | 'readonly' | 'pending'
    icon: ReactNode
    children: ReactNode
    side?: ReactNode
}) {
    return (
        <div className={`rk-banner rk-banner--${tone}`} role={tone === 'offline' ? 'alert' : 'status'}>
            {icon}
            <span>{children}</span>
            {side && <span className="rk-banner__side">{side}</span>}
        </div>
    )
}
