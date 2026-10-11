import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

/**
 * Wspólny element przejścia lista → szczegół (View Transitions, flaga `experimental.viewTransition` w next.config.ts).
 * `name` musi być unikalne dla obiektu (np. `show-poster-<id>`), inaczej przeglądarka pomiesza elementy.
 * Gdy React nie ma `ViewTransition` (stabilny kanał) albo przeglądarka nie ma wsparcia, to zwykły wrapper bez efektu.
 */
export function SharedElement({ name, children }: { name: string; children: ReactNode }) {
    if (!ViewTransition) return <>{children}</>
    return <ViewTransition name={name} share="auto" default="none">{children}</ViewTransition>
}
