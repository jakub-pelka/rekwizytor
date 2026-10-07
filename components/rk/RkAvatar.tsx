import { useId } from 'react'
import { RK_AVATARS, type RkAvatarName } from './avatar-data'

const PROFESSIONS: RkAvatarName[] = [
    'inspicjent', 'rezyser', 'rekwizytor', 'akustyk', 'oswietleniowiec',
    'kostiumerka', 'maszynista', 'suflerka', 'charakteryzatorka', 'dyrektor',
]

/** Dopóki osoba nie wybierze postaci, dobieramy zawód stabilnie po jej id. */
export function avatarFor(seed: string): RkAvatarName {
    let h = 0
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return PROFESSIONS[h % PROFESSIONS.length]
}

// Awatar ilustrowany (karta Avatar): postać na kafelku znaku z promieniem 22,5%.
// Rozmiary z karty: 24, 32, 40, 72. Wnętrze SVG pochodzi z design systemu, nie od użytkownika.
export function RkAvatar({ name, size = 32, label }: { name: RkAvatarName; size?: 24 | 32 | 40 | 72; label?: string }) {
    const clip = useId()
    const a = RK_AVATARS[name]
    // Niektóre postaci nie mają skóry albo włosów do podmiany (np. Pierrot); wtedy zostaje rysunek.
    const inner = a.inner.replaceAll('{SK}', a.sk ?? 'none').replaceAll('{HR}', a.hr ?? 'none')
    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            style={{ flex: 'none', display: 'block' }}
        >
            <defs><clipPath id={clip}><rect width="100" height="100" rx="22.5" /></clipPath></defs>
            <g clipPath={`url(#${clip})`}>
                <rect width="100" height="100" fill={a.bg} />
                <g dangerouslySetInnerHTML={{ __html: inner }} />
            </g>
        </svg>
    )
}
