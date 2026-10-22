'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { verifyInviteCode } from '@/app/actions/invite-entry'
import { CodeInput } from './CodeInput'
import { CODE_LENGTH, type InviteLookup } from './types'

interface InviteCodeStepProps {
    email: string
    /** Stan 'code' z lookupInvite (liczba prób), do pierwszego wyświetlenia. */
    attemptsLeft?: number
    /** Kod poprawny, sesja założona w ciasteczkach: pokaż krok z imieniem i hasłem. */
    onDone: () => void
    /** Serwer zwrócił inny stan niż „kod do wpisania” (zablokowane, wygasłe, cofnięte, konto). */
    onState: (lookup: InviteLookup) => void
}

/** Krok „Wpisz kod” (plansze Witaj-kod i Witaj-kod-stany, 1). Po błędzie cyfry zostają. */
export function InviteCodeStep({ email, attemptsLeft, onDone, onState }: InviteCodeStepProps) {
    const t = useTranslations('Welcome')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [wrongLeft, setWrongLeft] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (loading) return
        if (code.length !== CODE_LENGTH) {
            setWrongLeft(null)
            setError(t('codeIncomplete'))
            return
        }
        setError(null)
        setLoading(true)
        try {
            const res = await verifyInviteCode(email, code)
            if (!res.ok) {
                setError(res.error)
                return
            }
            const data = res.data
            if (data && 'next' in data) {
                onDone()
            } else if (data && data.state === 'code') {
                setWrongLeft(data.attemptsLeft)
            } else if (data) {
                onState(data)
            } else {
                setError(t('genericError'))
            }
        } catch {
            setError(t('genericError'))
        } finally {
            setLoading(false)
        }
    }

    const invalid = wrongLeft !== null
    const hint = wrongLeft !== null
        ? t('codeWrong', { n: wrongLeft })
        : error ?? (attemptsLeft !== undefined && attemptsLeft < 5 ? t('codeAttemptsLeft', { n: attemptsLeft }) : null)

    return (
        <form className="kd-pane" onSubmit={submit} noValidate>
            <h2>{t('codeTitle')}</h2>
            <CodeInput
                value={code}
                onChange={v => { setCode(v); if (wrongLeft !== null) setWrongLeft(null); if (error) setError(null) }}
                invalid={invalid}
                autoFocus
                onSubmit={() => void submit()}
            />
            {hint && <p className={`kd-hint${invalid || error ? ' err' : ''}`} role={invalid || error ? 'alert' : undefined}>{hint}</p>}
            <Button type="submit" size="lg" className="kd-full" isLoading={loading} loadingLabel={t('checking')}>
                {t('next')}
            </Button>
        </form>
    )
}
