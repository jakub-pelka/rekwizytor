import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, response?: NextResponse) {
    let supabaseResponse = response ?? NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )

                    // If a response was provided, we don't want to overwrite it with a generic NextResponse.next()
                    // unless we absolutely have to. The original code overwrote it to ensure the request 
                    // in the response was updated. 
                    // If we have a passed response (e.g. from next-intl), we should set cookies on it.
                    if (!response) {
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                    }

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    let user = null
    try {
        const {
            data: { user: supabaseUser },
        } = await supabase.auth.getUser()
        user = supabaseUser
    } catch (error) {
        console.error('Error fetching user in middleware:', error)
        // Treat as unauthenticated
    }

    const path = request.nextUrl.pathname
    const isAuthPage =
        path.startsWith('/login') ||
        path.startsWith('/auth') ||
        // Check for localized paths (e.g. /pl/login, /en/auth)
        /^\/(?:en|pl)\/(?:login|auth|forgot-password|update-password)/.test(path) ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/update-password')

    // Public read-only mode - allow access without login except for:
    // - Admin pages
    // - Settings pages
    // - User-specific pages (waiting, rejected)
    // - Write operations (handled by RLS)
    const isProtectedPage =
        path.includes('/admin') ||
        path.includes('/settings') ||
        path.includes('/waiting') ||
        path.includes('/rejected') ||
        path.includes('/no-theatre') ||
        // Etykiety QR (/g/<kod>, /scan/…): skan prowadzi do rzeczy z magazynu, więc tylko dla zalogowanych
        // pracowników. Zgubiona naklejka zeskanowana na ulicy kończy się na ekranie logowania.
        /^\/(?:(?:en|pl)\/)?(?:g|scan)(?:\/|$)/.test(path)

    if (!user && !isAuthPage && isProtectedPage) {
        // Redirect to login only for protected pages
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Po zalogowaniu wracamy tam, dokąd prowadził link (np. zeskanowana etykieta).
        url.search = ''
        url.searchParams.set('returnTo', `${path}${request.nextUrl.search}`)
        return NextResponse.redirect(url)
    }

    if (user && !isAuthPage) {
        // Check user status
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', user.id)
            .single()

        console.log('[Middleware Debug] User ID:', user.id)
        console.log('[Middleware Debug] Profile fetch result:', profile)
        console.log('[Middleware Debug] Profile fetch error:', error)

        const isWaitingPage = path.includes('/waiting')
        const isRejectedPage = path.includes('/rejected')
        const isNoTheatrePage = path.includes('/no-theatre')
        // Politykę prywatności i regulamin może przeczytać każdy, także osoba czekająca na zatwierdzenie.
        const isLegalPage = /\/(privacy|terms)(\/|$)/.test(path)

        // If no profile found, treat as pending (safe default)
        const status = profile?.status || 'pending'
        console.log('[Middleware Debug] Determined status:', status)

        if (status === 'pending' && !isWaitingPage && !isLegalPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/waiting'
            return NextResponse.redirect(url)
        }

        if (status === 'rejected' && !isRejectedPage && !isLegalPage) {
            const url = request.nextUrl.clone()
            url.pathname = '/rejected'
            return NextResponse.redirect(url)
        }

        if (status === 'approved' && (isWaitingPage || isRejectedPage)) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }

        // Zatwierdzone konto bez teatru nie ma czego oglądać (baza pokazuje tylko bieżący teatr): czeka na
        // dodanie do teatru. Superadmin przechodzi zawsze. Błąd zapytania (np. baza przed migracją teatrów)
        // nie blokuje nikogo.
        if (status === 'approved' && profile?.role !== 'admin' && !isLegalPage) {
            const { count, error: membersError } = await supabase
                .from('theatre_members')
                .select('theatre_id', { count: 'exact', head: true })
                .eq('user_id', user.id)
            const hasTheatre = membersError ? true : (count ?? 0) > 0
            if (!hasTheatre && !isNoTheatrePage) {
                const url = request.nextUrl.clone()
                url.pathname = '/no-theatre'
                return NextResponse.redirect(url)
            }
            if (hasTheatre && isNoTheatrePage) {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse
}
