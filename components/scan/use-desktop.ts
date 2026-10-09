import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 768px)'

// Układ komputera zaczyna się od `md` (jak w Tailwindzie). Na serwerze i przy pierwszym renderze zakładamy telefon.
export function useDesktop() {
    return useSyncExternalStore(
        cb => {
            const mq = window.matchMedia(QUERY)
            mq.addEventListener('change', cb)
            return () => mq.removeEventListener('change', cb)
        },
        () => window.matchMedia(QUERY).matches,
        () => false,
    )
}
