import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/proxy'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
    // Skip intl middleware for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        return await updateSession(request);
    }

    // First run the intl middleware to handle locale routing
    const response = intlMiddleware(request);

    // Then run the supabase proxy, passing the response
    return await updateSession(request, response);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
    ],
}
