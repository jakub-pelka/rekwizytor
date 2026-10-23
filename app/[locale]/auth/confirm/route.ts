import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

// Link z maila (zaproszenie, reset hasła): /auth/confirm?token_hash=…&type=invite&next=/update-password.
// Szablony maili w Supabase (docs/TEATRY.md, „Maile”) wskazują tutaj, a nie na domyślny adres z tokenem w hashu,
// którego serwer nie widzi. Tu token zamieniamy na sesję i dopiero wtedy przechodzimy dalej.
const TYPES: EmailOtpType[] = ['invite', 'recovery', 'email', 'signup', 'magiclink', 'email_change']

// Tylko ścieżki w aplikacji: ?next=https://obcy.pl albo //obcy.pl nie robi z nas przekierowania na zewnątrz.
const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/')

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = safeNext(searchParams.get('next'))

    const forwardedHost = request.headers.get('x-forwarded-host')
    const base = process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : origin

    if (tokenHash && type && TYPES.includes(type)) {
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (!error) return NextResponse.redirect(`${base}${next}`)
        // Link z zaproszenia, który wygasł albo był już użyty: ekran z wyjaśnieniem, w języku ze ścieżki (/pl/auth/confirm).
        if (type === 'invite') {
            const locale = /^\/(en|pl)(?:\/|$)/.exec(new URL(request.url).pathname)?.[1] ?? 'pl'
            return NextResponse.redirect(`${base}/${locale}/witaj?stan=wygasl`)
        }
    }

    // Link wygasł albo był już użyty: logowanie z informacją, co zrobić dalej.
    return NextResponse.redirect(`${base}/login?link=expired`)
}
