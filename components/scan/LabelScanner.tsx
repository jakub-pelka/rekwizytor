'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flashlight, Keyboard, TriangleAlert, X } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { resolveCode } from '@/app/actions/resolve-code'

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector } }

// Aparat do etykiet (karta Skaner): kolory stałe, niezależne od motywu. Ramka celownika biała,
// ochrowa z podpowiedzią, gdy kodu nie widać. Na dole latarka i „Wpisz numer”.
export function LabelScanner() {
    const t = useTranslations('LabelScan')
    const router = useRouter()
    const video = useRef<HTMLVideoElement>(null)
    const [hint, setHint] = useState<'none' | 'notFound' | 'unsupported' | 'noCamera'>('none')
    const [manual, setManual] = useState(false)
    const [code, setCode] = useState('')
    const [torch, setTorch] = useState(false)
    const [busy, setBusy] = useState(false)
    const [unknown, setUnknown] = useState<string | null>(null)
    const paused = useRef(false)
    const stream = useRef<MediaStream | null>(null)

    const open = async (value: string) => {
        setBusy(true)
        const path = await resolveCode(value)
        setBusy(false)
        if (path) { router.push(path); return }
        // Nieznany kod: arkusz z decyzją, skanowanie wstrzymane do „Skanuj dalej”.
        paused.current = true
        setManual(false)
        setUnknown(value.length > 40 ? value.slice(0, 40) + '…' : value)
    }

    useEffect(() => {
        let stopped = false
        let timer: ReturnType<typeof setTimeout>
        let hintTimer: ReturnType<typeof setTimeout>

        void (async () => {
            try {
                stream.current = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                })
                if (stopped || !video.current) return
                video.current.srcObject = stream.current
                await video.current.play().catch(() => {})
            } catch {
                setHint('noCamera')
                setManual(true)
                return
            }

            if (stopped || !video.current) return

            // Gdy przez kilka sekund nie widać kodu, ramka robi się ochrowa z podpowiedzią.
            hintTimer = setTimeout(() => !stopped && setHint(h => (h === 'none' ? 'notFound' : h)), 6000)

            if (window.BarcodeDetector) {
                try {
                    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
                    const tick = async () => {
                        if (stopped || !video.current) return
                        if (paused.current) { timer = setTimeout(tick, 500); return }
                        try {
                            const found = await detector.detect(video.current)
                            if (found[0]) {
                                await open(found[0].rawValue)
                                if (stopped) return
                                if (paused.current) { timer = setTimeout(tick, 500); return }
                                return
                            }
                        } catch { /* klatka jeszcze niegotowa */ }
                        timer = setTimeout(tick, 300)
                    }
                    void tick()
                    return
                } catch {
                    // W razie błędu BarcodeDetector przejdź do fallbacku jsQR
                }
            }

            // Fallback jsQR dla Safari na iOS i przeglądarek bez BarcodeDetector
            const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
            const ctx = canvas?.getContext('2d', { willReadFrequently: true })
            if (!canvas || !ctx) {
                setHint('unsupported')
                setManual(true)
                return
            }

            let jsQR: typeof import('jsqr').default | null = null
            try {
                const mod = await import('jsqr')
                jsQR = mod.default || (mod as unknown as typeof import('jsqr').default)
            } catch {
                // brak możliwości załadowania jsqr
            }

            if (!jsQR) {
                setHint('unsupported')
                setManual(true)
                return
            }

            const tick = async () => {
                if (stopped || !video.current) return
                if (paused.current) { timer = setTimeout(tick, 500); return }
                try {
                    const vw = video.current.videoWidth
                    const vh = video.current.videoHeight
                    if (vw && vh) {
                        const scale = Math.min(1, 640 / Math.max(vw, vh))
                        const width = Math.round(vw * scale)
                        const height = Math.round(vh * scale)
                        if (canvas.width !== width) canvas.width = width
                        if (canvas.height !== height) canvas.height = height
                        ctx.drawImage(video.current, 0, 0, width, height)
                        const imageData = ctx.getImageData(0, 0, width, height)
                        const result = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: 'dontInvert',
                        })
                        if (result?.data) {
                            await open(result.data)
                            if (stopped) return
                            if (paused.current) { timer = setTimeout(tick, 500); return }
                            return
                        }
                    }
                } catch { /* klatka jeszcze niegotowa */ }
                timer = setTimeout(tick, 250)
            }
            void tick()
        })()

        return () => {
            stopped = true
            clearTimeout(timer)
            clearTimeout(hintTimer)
            stream.current?.getTracks().forEach(tr => tr.stop())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleTorch = async () => {
        const track = stream.current?.getVideoTracks()[0]
        try { await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch) } catch { /* brak latarki */ }
    }

    return (
        <div className="fixed inset-0 z-[70]">
            <div className="rk-cam">
                <div className="rk-cam__top" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(56px + env(safe-area-inset-top))' }}>
                    <button className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('close')} onClick={() => router.back()}><X /></button>
                    <span style={{ font: '600 15px/20px var(--font-sans)' }}>{t('title')}</span>
                    <span className="w-11" />
                </div>
                <div className="rk-cam__view">
                    <video ref={video} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
                    <div className={`rk-cam__frame ${hint === 'notFound' ? 'rk-cam__frame--warn' : ''}`}><i /><i /><i /><i /></div>
                    {hint !== 'none' && (
                        <div className="rk-cam__hint">
                            <b>{t(`${hint}Title`)}</b>
                            {t(`${hint}Text`)}
                        </div>
                    )}
                </div>
                <div className="rk-cam__bar" style={{ paddingBottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))' }}>
                    <button className="rk-btn rk-btn--secondary rk-btn--icon !bg-transparent" aria-label={t('torch')} aria-pressed={torch} onClick={toggleTorch}><Flashlight /></button>
                    <button className="rk-btn rk-btn--secondary !bg-transparent" onClick={() => setManual(true)}><Keyboard />{t('typeCode')}</button>
                </div>
            </div>

            {unknown && (
                <div className="rk-sheet" role="alertdialog" aria-labelledby="unknown-title">
                    <span className="rk-sheet__grip" />
                    <div className="flex gap-3">
                        <span className="pl-ico pl-ico--warning"><TriangleAlert /></span>
                        <div className="flex flex-col gap-1">
                            <b id="unknown-title" style={{ font: '600 16px/24px var(--font-sans)' }}>{t('unknownTitle', { code: unknown })}</b>
                            <span className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('unknownText')}</span>
                        </div>
                    </div>
                    <Button size="lg" className="w-full" onClick={() => { setUnknown(null); paused.current = false }}>{t('scanMore')}</Button>
                    <Link className="rk-btn rk-btn--ghost w-full" href="/scan">{t('addAsNew')}</Link>
                </div>
            )}

            {manual && (
                <form className="rk-sheet" onSubmit={e => { e.preventDefault(); if (code.trim()) void open(code) }}>
                    <span className="rk-sheet__grip" />
                    <label className="rk-field">
                        <span className="rk-label">{t('codeLabel')}</span>
                        <input className="rk-input" style={{ fontFamily: 'var(--font-typewriter)' }} autoFocus value={code} onChange={e => setCode(e.target.value)} placeholder="REK-0142" />
                    </label>
                    <Button type="submit" size="lg" className="w-full" isLoading={busy} loadingLabel={t('searching')}>{t('open')}</Button>
                    <button type="button" className="rk-btn rk-btn--ghost w-full" onClick={() => setManual(false)}>{t('cancel')}</button>
                </form>
            )}
        </div>
    )
}
