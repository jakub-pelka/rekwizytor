'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

export const CURTAIN_EVENT = 'rk-curtain'
/** Kurtyna zakryła cały ekran (koniec rozsuwania albo od razu w wersji oszczędnej). */
const COVERED_EVENT = 'rk-curtain-covered'

/** Czasy z ekranu Logowanie-przejscie: 0,4 s rozsuwanie, 0,8 s w górę; wersja oszczędna: przyciemnienie 0,2 s. */
const NORMAL = { expand: 400, up: 800 }
/** Wolniejsze przejście (wejście w tryb demo): 1,5 s w bok, 1 s w górę. */
const SLOW = { expand: 1500, up: 1000 }
const FADE = 200

type Box = { x: number; y: number; w: number; h: number }
type CurtainStart = {
    slow?: boolean
    /** Panel z satyną na ekranie logowania. */
    stage: Box | null
    /** Logo na panelu: stąd jedzie na środek ekranu. */
    logo: Box | null
    /** Bieżąca klatka wideo z logowania: nowe wideo w chwili przejścia to dekodowanie w najgorszym momencie. */
    frame: HTMLCanvasElement | null
    /** To samo wideo i sekunda, od której gra dalej pod kurtyną (plik jest już w pamięci przeglądarki). */
    video: { src: string; time: number } | null
    /** Proporcje klatki (szerokość / wysokość). */
    aspect: number
}

const box = (r: DOMRect | undefined): Box | null => (r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null)

function grabFrame(video: HTMLVideoElement | null | undefined): HTMLCanvasElement | null {
    if (!video || video.readyState < 2 || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    try {
        canvas.getContext('2d')?.drawImage(video, 0, 0)
    } catch {
        return null
    }
    return canvas
}

/** Prostokąt obrazu o proporcjach `aspect` wpasowanego w `b` jak object-fit: cover. */
function cover(aspect: number, b: Box): Box {
    const w = Math.max(b.w, b.h * aspect)
    const h = w / aspect
    return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h }
}

const isLite = () =>
    document.documentElement.dataset.motion === 'lite' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

const easeInOut = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--ease-in-out').trim() || 'cubic-bezier(.65, 0, .35, 1)'

/**
 * Po zalogowaniu: kurtyna startuje z miejsca lewego panelu (`from`), rozsuwa się na cały ekran i czeka,
 * aż pulpit będzie na miejscu. Zwraca obietnicę, która spełnia się, gdy ekran jest już zasłonięty,
 * żeby nawigacja nie mignęła pulpitem w prawej połowie.
 */
export function lowerCurtain(from: HTMLElement | null, video?: HTMLVideoElement | null, opts: { slow?: boolean } = {}): Promise<void> {
    const detail: CurtainStart = {
        slow: opts.slow,
        stage: box(from?.getBoundingClientRect()),
        logo: box(from?.querySelector('.ld-words img')?.getBoundingClientRect()),
        frame: grabFrame(video),
        video: video?.currentSrc ? { src: video.currentSrc, time: video.currentTime } : null,
        aspect: video?.videoWidth ? video.videoWidth / video.videoHeight : 16 / 9,
    }
    // Nawigacja rusza dopiero, gdy ekran jest naprawdę zakryty (koniec animacji, a nie zegar), żeby pulpit nie mignął
    // w niezakrytej części, gdy animacja zgubi klatkę na starcie. Zapas czasu na wypadek, gdyby kurtyna nie ruszyła.
    const covered = new Promise<void>(resolve => {
        const done = () => { window.removeEventListener(COVERED_EVENT, done); window.clearTimeout(id); resolve() }
        const id = window.setTimeout(done, (opts.slow ? SLOW : NORMAL).expand + 600)
        window.addEventListener(COVERED_EVENT, done)
    })
    window.dispatchEvent(new CustomEvent(CURTAIN_EVENT, { detail }))
    return covered
}

const isLogin = (path: string) => /^\/(?:[a-z]{2}\/)?login/.test(path)

// Raz, po zalogowaniu, nigdy w pętli (ekran Logowanie-przejscie, design system 01-ruch.md).
// Fazy: expand (panel rośnie na cały ekran) → cover (czeka na pulpit) → up (kurtyna w górę) → idle.
// Cały ruch to transform i opacity przez Web Animations API, więc liczy go kompozytor i nie tnie się,
// gdy główny wątek renderuje pulpit.
export function CurtainReveal() {
    const t = useTranslations('Login')
    const pathname = usePathname()
    const [phase, setPhase] = useState<'idle' | 'expand' | 'cover' | 'up'>('idle')
    const [start, setStart] = useState<CurtainStart | null>(null)
    const outerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const frameRef = useRef<HTMLDivElement>(null)
    const shadeRef = useRef<HTMLDivElement>(null)
    const wordsRef = useRef<HTMLDivElement>(null)
    const tagRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        const lower = (e: Event) => {
            setStart((e as CustomEvent<CurtainStart>).detail ?? null)
            // Wersja oszczędna: bez rozsuwania, kurtyna od razu na całym ekranie.
            const lite = isLite()
            setPhase(lite ? 'cover' : 'expand')
            if (lite) window.setTimeout(() => window.dispatchEvent(new Event(COVERED_EVENT)), 0)
        }
        window.addEventListener(CURTAIN_EVENT, lower)
        return () => window.removeEventListener(CURTAIN_EVENT, lower)
    }, [])

    // Gdyby nawigacja się nie udała, nie zostawiamy użytkownika pod kurtyną.
    useEffect(() => {
        if (phase !== 'cover') return
        const id = window.setTimeout(() => setPhase('up'), 8000)
        return () => window.clearTimeout(id)
    }, [phase])

    // Pulpit jest już na ekranie: kurtyna idzie w górę.
    const shown = phase === 'cover' && !isLogin(pathname) ? 'up' : phase

    // Klatka satyny trafia do warstwy, zanim ruszy animacja. Nad nią to samo wideo gra dalej od tej samej sekundy,
    // żeby kurtyna nie stała w miejscu, gdy wczytuje się pulpit; pokazuje się dopiero, gdy naprawdę gra, więc
    // do tego czasu widać klatkę. W wersji oszczędnej zostaje sama klatka.
    const liveRef = useRef<HTMLVideoElement | null>(null)
    useLayoutEffect(() => {
        const frame = frameRef.current
        if (shown === 'idle' || !start || !frame) return
        if (start.frame && !frame.contains(start.frame)) frame.replaceChildren(start.frame)
        if (start.video && !liveRef.current && !isLite()) {
            const live = document.createElement('video')
            Object.assign(live, { muted: true, loop: true, playsInline: true, preload: 'auto', src: start.video.src })
            Object.assign(live.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', opacity: '0' })
            live.addEventListener('loadedmetadata', () => { live.currentTime = start.video!.time }, { once: true })
            live.addEventListener('playing', () => { live.style.opacity = '1' }, { once: true })
            live.play().catch(() => {})
            frame.append(live)
            liveRef.current = live
        }
    }, [shown, start])
    useEffect(() => {
        if (shown !== 'idle') return
        liveRef.current?.pause()
        liveRef.current = null
    }, [shown])

    // 1) Rozsuwanie. Warstwa na cały ekran jest przesunięta tak, że widać tylko obszar panelu, a jej zawartość
    // przesunięta odwrotnie, więc stoi w miejscu i jedzie tylko krawędź. Klatka i cieniowanie skalują się z panelu
    // na cały ekran, logo jedzie na środek, hasło gaśnie.
    useLayoutEffect(() => {
        if (phase !== 'expand' || !start) return
        const outer = outerRef.current, inner = innerRef.current, frame = frameRef.current
        const shade = shadeRef.current, words = wordsRef.current, tag = tagRef.current
        if (!outer || !inner || !frame || !shade || !words || !tag) return
        const vw = window.innerWidth, vh = window.innerHeight
        const s = start.stage ?? { x: 0, y: 0, w: vw / 2, h: vh }
        const X = s.x + s.w - vw, Y = s.y + s.h - vh
        const end = cover(start.aspect, { x: 0, y: 0, w: vw, h: vh })
        const from = cover(start.aspect, s)
        const logo = words.querySelector('img')?.getBoundingClientRect()
        const dx = start.logo && logo ? start.logo.x + start.logo.w / 2 - (logo.left + logo.width / 2) : 0
        const dy = start.logo && logo ? start.logo.y + start.logo.h / 2 - (logo.top + logo.height / 2) : 0
        const duration = (start.slow ? SLOW : NORMAL).expand
        const opts: KeyframeAnimationOptions = { duration, easing: easeInOut(), fill: 'both' }
        const anims = [
            outer.animate([{ transform: `translate(${X}px, ${Y}px)` }, { transform: 'none' }], opts),
            inner.animate([{ transform: `translate(${-X}px, ${-Y}px)` }, { transform: 'none' }], opts),
            frame.animate([{ transform: `translate(${from.x - end.x}px, ${from.y - end.y}px) scale(${from.w / end.w})` }, { transform: 'none' }], opts),
            shade.animate([{ transform: `translate(${s.x}px, ${s.y}px) scale(${s.w / vw}, ${s.h / vh})` }, { transform: 'none' }], opts),
            words.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], opts),
            tag.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.6, easing: 'linear', fill: 'both' }),
        ]
        // Animacje kasuje sprzątanie efektu, już po przejściu w fazę cover (w tym samym commicie, przed malowaniem),
        // więc stan końcowy nie mignie stanem bazowym.
        anims[0].finished.then(() => {
            setPhase(p => (p === 'expand' ? 'cover' : p))
            window.dispatchEvent(new Event(COVERED_EVENT))
        }).catch(() => {})
        return () => anims.forEach(a => a.cancel())
    }, [phase, start])

    // 2) W górę: przesunięcie w pionie; w wersji oszczędnej samo przyciemnienie.
    useLayoutEffect(() => {
        if (shown !== 'up') return
        const outer = outerRef.current
        if (!outer) return
        const anim = isLite()
            ? outer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE, easing: 'linear', fill: 'forwards' })
            : outer.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: (start?.slow ? SLOW : NORMAL).up, easing: easeInOut(), fill: 'forwards' })
        anim.finished.then(() => setPhase('idle')).catch(() => {})
        return () => anim.cancel()
    }, [shown, start])

    if (shown === 'idle') return null

    const end = cover(start?.aspect ?? 16 / 9, { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight })

    return (
        <div className={`cu is-${shown}`} ref={outerRef} aria-hidden="true">
            <div className="cu__in" ref={innerRef}>
                <div className="cu__frame" ref={frameRef} style={{ left: end.x, top: end.y, width: end.w, height: end.h }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {!start?.frame && <img src="/media/logowanie/kurtyna-tlo-poster.jpg" alt="" style={{ objectFit: 'cover' }} />}
                </div>
                <div className="cu__shade" ref={shadeRef} />
                <div className="ld-words" ref={wordsRef}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/rekwizytor-logo-mono-bialy.svg" alt="" />
                    <p className="lg-tag" ref={tagRef}>{t('showcaseLead')}</p>
                </div>
            </div>
        </div>
    )
}
