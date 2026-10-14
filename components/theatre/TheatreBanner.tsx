'use client'

import LightRays from '@/components/ui/LightRays'
import { useMotionPreference } from '@/components/rk/MotionProvider'

type Props = {
    name: string
    meta: string
}

// Baner teatru: monogram, nazwa i metryka na bordowym tle z promieniami z prawego rogu.
// Pełny ruch (Premiera): animowane promienie WebGL. Próba czytana: te same promienie jako statyczny gradient, bez canvas.
export function TheatreBanner({ name, meta }: Props) {
    const { level } = useMotionPreference()
    const initial = name.trim().charAt(0).toLocaleUpperCase('pl')

    return (
        <section
            className="relative isolate flex items-center gap-4 overflow-hidden rounded-lg border border-border px-4 py-5 md:gap-6 md:px-6 md:py-8"
            style={{ background: 'linear-gradient(110deg, var(--kurtyna-night) 0%, #1a0d0f 55%, #0e0b0b 100%)' }}
            aria-label={name}
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background: 'repeating-conic-gradient(from 200deg at 100% -10%, rgba(255,255,255,0.14) 0deg 1.5deg, transparent 1.5deg 6deg)',
                    maskImage: 'radial-gradient(ellipse 90% 140% at 100% 0%, #000 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 90% 140% at 100% 0%, #000 0%, transparent 70%)',
                    opacity: level === 'full' ? 0 : 1,
                }}
            />
            {level === 'full' && (
                <div aria-hidden className="absolute inset-0 -z-10">
                    <LightRays
                        raysOrigin="top-right"
                        raysColor="#ffffff"
                        raysSpeed={0.6}
                        lightSpread={0.8}
                        rayLength={1.6}
                        followMouse={false}
                        noiseAmount={0.1}
                        className="opacity-70"
                    />
                </div>
            )}
            <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-lg bg-white font-serif text-3xl font-bold text-[#14213d] md:size-[66px] md:text-4xl"
            >
                {initial}
            </span>
            <div className="min-w-0">
                <h2 className="truncate font-sans text-xl font-semibold text-white md:text-3xl">{name}</h2>
                <p className="mt-1 text-sm text-white/70">{meta}</p>
            </div>
        </section>
    )
}
