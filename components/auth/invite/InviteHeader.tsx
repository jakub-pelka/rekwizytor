'use client'

import { useTranslations } from 'next-intl'
import type { InviteWho } from './types'

/** Linijka „kto zaprasza do jakiego teatru” (klasa .kd-inv z plansz Witaj-kod). */
export function InviteHeader({ inviterName, theatreName }: InviteWho) {
    const t = useTranslations('Welcome')
    return (
        <p className="kd-inv">
            {inviterName
                ? t.rich('inviteLine', { name: inviterName, theatre: theatreName, b: chunks => <b>{chunks}</b> })
                : t.rich('inviteLineNoName', { theatre: theatreName, b: chunks => <b>{chunks}</b> })}
        </p>
    )
}
