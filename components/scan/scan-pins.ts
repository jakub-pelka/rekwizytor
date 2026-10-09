import type { ScanFinding } from '@/app/actions/scan-photo'

export type ScanRow = ScanFinding & { key: string; checked: boolean }

const clamp01 = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))
export const boxArea = (b: NonNullable<ScanFinding['box']>) => b.w * b.h

/**
 * Środki znaczników na zdjęciu. Mniejsze ramki idą pierwsze (ich środek najdokładniej wskazuje rzecz),
 * a gdy kolejny znacznik wypada zbyt blisko poprzedniego, odsuwamy go po spirali. Odległości liczymy
 * w szerokościach zdjęcia, żeby nie zależały od jego proporcji.
 */
export function pinPositions(list: ScanRow[], aspect: number) {
    const MIN = 0.065
    const placed: { x: number; y: number }[] = []
    const out = new Map<string, { x: number; y: number }>()
    const boxed = list.filter((f): f is ScanRow & { box: NonNullable<ScanRow['box']> } => !!f.box).sort((a, b) => boxArea(a.box) - boxArea(b.box))
    for (const f of boxed) {
        const cx = f.box.x + f.box.w / 2, cy = f.box.y + f.box.h / 2
        let spot = { x: cx, y: cy }
        search: for (let ring = 0; ring <= 6; ring++) {
            const steps = ring === 0 ? 1 : ring * 6
            for (let k = 0; k < steps; k++) {
                const a = (2 * Math.PI * k) / steps
                const x = clamp01(cx + Math.cos(a) * ring * MIN * 0.8, 0.03, 0.97)
                const y = clamp01(cy + (Math.sin(a) * ring * MIN * 0.8) / aspect, 0.03, 0.97)
                if (placed.every(p => Math.hypot(p.x - x, (p.y - y) * aspect) >= MIN)) { spot = { x, y }; break search }
            }
        }
        placed.push(spot)
        out.set(f.key, spot)
    }
    return out
}
