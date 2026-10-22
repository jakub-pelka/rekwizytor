'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InviteHeader } from './InviteHeader'
import { InviteEmailStep } from './InviteEmailStep'
import { InviteCodeStep } from './InviteCodeStep'
import { InviteDetailsStep } from './InviteDetailsStep'
import { InviteStateMessage } from './InviteStateMessage'
import type { InviteLookup, InviteWho } from './types'

export type InviteFlowStart =
    | { step: 'email'; email?: string; error?: string | null; notFound?: boolean }
    | { step: 'code'; email: string; lookup: Extract<InviteLookup, { state: 'code' }> }
    | { step: 'details'; who: InviteWho; initialName?: string }
    | { step: 'state'; lookup: Extract<InviteLookup, { state: 'locked' | 'expired' | 'revoked' | 'account' }>; email?: string }

type Current =
    | { step: 'email'; email: string; error: string | null; notFound: boolean; who: InviteWho | null }
    | { step: 'code'; email: string; attemptsLeft: number; who: InviteWho }
    | { step: 'details'; who: InviteWho | null; initialName: string }
    | { step: 'state'; lookup: Extract<InviteLookup, { state: 'locked' | 'expired' | 'revoked' | 'account' }>; who: InviteWho | null }

const whoOf = (l: InviteLookup): InviteWho | null =>
    'theatreName' in l ? { inviterName: l.inviterName, theatreName: l.theatreName } : null

/**
 * Cały przebieg wejścia z zaproszenia: e-mail, kod, imię i hasło, stany końcowe.
 * Niezależny od układu strony (render: linijka zapraszającego + panel kroku).
 * Po poprawnym kodzie serwer zakłada sesję w ciasteczkach, a krok z hasłem pokazujemy po stronie klienta.
 */
export function InviteFlow({ start, onFinished }: { start: InviteFlowStart; onFinished?: () => void }) {
    const router = useRouter()
    const [cur, setCur] = useState<Current>(() => {
        switch (start.step) {
            case 'code':
                return { step: 'code', email: start.email, attemptsLeft: start.lookup.attemptsLeft, who: whoOf(start.lookup)! }
            case 'details':
                return { step: 'details', who: start.who, initialName: start.initialName ?? '' }
            case 'state':
                return { step: 'state', lookup: start.lookup, who: whoOf(start.lookup) }
            default:
                return { step: 'email', email: start.email ?? '', error: start.error ?? null, notFound: !!start.notFound, who: null }
        }
    })

    // Wynik sprawdzenia adresu albo złego kodu: przejście do właściwego kroku.
    const apply = (email: string, lookup: InviteLookup) => {
        const who = whoOf(lookup)
        if (lookup.state === 'code') setCur({ step: 'code', email, attemptsLeft: lookup.attemptsLeft, who: who! })
        else if (lookup.state === 'none') setCur({ step: 'email', email, error: null, notFound: true, who: null })
        else setCur({ step: 'state', lookup, who })
    }

    return (
        <>
            {cur.who && <InviteHeader {...cur.who} />}
            {cur.step === 'email' && (
                <InviteEmailStep
                    key={cur.email + String(cur.notFound)}
                    initialEmail={cur.email}
                    initialError={cur.error}
                    initialNotFound={cur.notFound}
                    onResolved={apply}
                />
            )}
            {cur.step === 'code' && (
                <InviteCodeStep
                    email={cur.email}
                    attemptsLeft={cur.attemptsLeft}
                    onDone={() => {
                        setCur({ step: 'details', who: cur.who, initialName: '' })
                        // Serwer też ma zobaczyć świeżą sesję (kolejne wejście na /witaj trafi od razu w ten krok).
                        router.refresh()
                    }}
                    onState={l => apply(cur.email, l)}
                />
            )}
            {cur.step === 'details' && <InviteDetailsStep initialName={cur.initialName} onDone={onFinished} />}
            {cur.step === 'state' && <InviteStateMessage lookup={cur.lookup} />}
        </>
    )
}
