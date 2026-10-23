import type { ReactNode } from 'react'

// Pasek stanu pod nagłówkiem (karta StatusBanner, .rk-banner). Jeden pasek naraz, treść jednym zdaniem.
// Kolejność ważności: offline > tylko do odczytu > oczekujący. Ton „error” (.rk-banner--error): limit AI teatru wyczerpany.
export function StatusBanner({
    tone, icon, children, side,
}: {
    tone: 'offline' | 'sync' | 'ok' | 'readonly' | 'pending' | 'error'
    icon: ReactNode
    children: ReactNode
    side?: ReactNode
}) {
    return (
        <div className={`rk-banner rk-banner--${tone}`} role={tone === 'offline' || tone === 'error' ? 'alert' : 'status'}>
            {icon}
            <span>{children}</span>
            {side && <span className="rk-banner__side">{side}</span>}
        </div>
    )
}
