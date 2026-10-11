import { Fragment } from 'react'
import { Check } from 'lucide-react'
import { Link } from '@/i18n/routing'

export type Step = { label: string; note?: string; href?: string }

// Kroki kreatora (karta Stepper, .rk-steps): zrobione z ptaszkiem i klikalne (powrót), bieżący z poświatą,
// przyszłe tylko obrysem.
export function Steps({ steps, current, label }: { steps: Step[]; current: number; label: string }) {
    return (
        <ol className="rk-steps" aria-label={label}>
            {steps.map((step, i) => {
                const state = i < current ? 'is-done' : i === current ? 'is-current' : ''
                const body = (
                    <>
                        <span className="rk-step__dot">{i < current ? <Check /> : i + 1}</span>
                        <span className="rk-step__label">
                            <b>{step.label}</b>
                            {step.note && <small>{step.note}</small>}
                        </span>
                    </>
                )
                return (
                    <Fragment key={step.label}>
                        {i > 0 && <li aria-hidden="true" className={`rk-step__line ${i <= current ? 'is-done' : ''}`} />}
                        <li className={`rk-step ${state}`} aria-current={i === current ? 'step' : undefined}>
                            {i < current && step.href
                                ? <Link href={step.href} className="flex items-center gap-3 no-underline">{body}</Link>
                                : body}
                        </li>
                    </Fragment>
                )
            })}
        </ol>
    )
}
