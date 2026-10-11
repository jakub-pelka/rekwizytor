// Płynne przewinięcie do elementu krzywą --ease-in-out z design systemu (cubic-bezier(.65, 0, .35, 1),
// czyli easeInOutCubic). W Próbie czytanej (data-motion="lite" albo „ogranicz ruch”) skok bez animacji.

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function scrollParent(el: HTMLElement): HTMLElement {
    for (let p = el.parentElement; p; p = p.parentElement) {
        const { overflowY } = getComputedStyle(p)
        if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement
}

const isLite = () =>
    document.documentElement.dataset.motion === 'lite' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function smoothScrollTo(el: HTMLElement) {
    const box = scrollParent(el)
    const isRoot = box === document.scrollingElement || box === document.documentElement
    const boxTop = isRoot ? 0 : box.getBoundingClientRect().top
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const from = box.scrollTop
    const to = Math.max(0, from + el.getBoundingClientRect().top - boxTop - margin)

    if (isLite() || Math.abs(to - from) < 2) { box.scrollTop = to; return }

    // Dłuższa droga dostaje trochę więcej czasu, ale bez przeciągania: 300–700 ms.
    const duration = Math.min(700, 300 + Math.abs(to - from) / 6)
    const start = performance.now()
    const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        box.scrollTop = from + (to - from) * easeInOut(t)
        if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
}
