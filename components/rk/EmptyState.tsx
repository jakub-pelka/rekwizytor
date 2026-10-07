import type { ReactNode } from 'react'

const BELLS = [8, 21, 34, 47, 60, 73, 86, 99]

// Ilustracje z karty EmptyState: kurtyna zasłonięta (czegoś jeszcze brak) i kurtyna w górze (wszystko gotowe).
function CurtainArt({ up }: { up: boolean }) {
    return (
        <svg className="rk-empty__art" viewBox="0 0 120 84" aria-hidden="true">
            <rect x="0" y="0" width="120" height="84" rx="8" style={{ fill: 'var(--surface-raised)' }} />
            {up ? (
                <>
                    <rect x="8" y="64" width="104" height="14" style={{ fill: 'var(--kurtyna-night)' }} />
                    <g style={{ fill: 'var(--kurtyna)' }}>
                        <path d="M8 6h16c-2 20 4 40 10 58H8z" />
                        <path d="M112 6H96c2 20-4 40-10 58h26z" />
                    </g>
                </>
            ) : (
                <>
                    <g style={{ fill: 'var(--kurtyna)' }}>
                        <rect x="8" y="6" width="51" height="72" />
                        <rect x="61" y="6" width="51" height="72" />
                    </g>
                    <g style={{ fill: 'var(--kurtyna-deep)' }}>
                        {[20, 36, 52, 72, 88, 104].map(x => <rect key={x} x={x} y="6" width="3" height="72" />)}
                    </g>
                </>
            )}
            <g style={{ fill: 'var(--kurtyna-night)' }}>
                <rect x="8" y="6" width="104" height="6" />
                {BELLS.map(x => <rect key={x} x={x} y="6" width="13" height="13" rx="6.5" />)}
            </g>
            {up && <rect x="50" y="56" width="20" height="8" rx="2" style={{ fill: 'var(--success)' }} />}
        </svg>
    )
}

// Pusty stan (karta EmptyState): co jest puste i co zrobić dalej, jednym zdaniem i jedną główną akcją.
// Na telefonie bez karty, prosto w treści; akcja główna na pełną szerokość.
export function EmptyState({
    art, title, children, actions, compact = false,
}: {
    art?: 'closed' | 'up'
    title: string
    children?: ReactNode
    actions?: ReactNode
    compact?: boolean
}) {
    return (
        <div className={`rk-empty ${compact ? 'rk-empty--compact' : ''} max-md:!px-0`}>
            {art && !compact && <CurtainArt up={art === 'up'} />}
            <h3 className="rk-empty__title">{title}</h3>
            {children && <p className="rk-empty__text">{children}</p>}
            {actions && <div className="flex w-full flex-col items-center gap-3 md:w-auto">{actions}</div>}
        </div>
    )
}
