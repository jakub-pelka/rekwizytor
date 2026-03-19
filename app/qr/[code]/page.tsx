import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
    readonly params: Promise<{
        readonly code: string
    }>
}

export default async function QrRedirectPage({ params }: PageProps) {
    const { code } = await params
    const supabase = await createClient()

    // 1. Fetch the code details (excluding RLS for now to check access manually first if needed, 
    // or relying on RLS if we trust it completely. 
    // Let's use RLS safe query first. Since "View QR Codes" policy handles access logic,
    // we just need to try fetching it.

    // However, for correct redirection logic (e.g. redirect to login if unauthenticated but code requires it),
    // we might want to know if it exists even if we can't "see" the target_url yet.
    // But for security, if it's private/authenticated and we are anon, we shouldn't even know it exists?
    // Actually standard UX dictates:
    // If access_level is authenticated and user is anon -> Redirect to Login
    // If access_level is private and user is not owner -> 404 Not Found

    // To implement "Redirect to Login", we need to know it demands authentication.
    // Our RLS policy hides it completely if we are anon and logic assumes authenticated.
    // OPTION A: Simple RLS. If we get nothing, show 404. User logs in manually if they know they should.
    // OPTION B: Smarter Logic. Use a service_role administrative client here solely to check *existence* and *access level* 
    // without revealing target_url, then decide whether to redirect to login.

    // Let's go with OPTION A+ (Manual Check with User Session).

    const { data: { user } } = await supabase.auth.getUser()

    // We use a query that bypasses RLS just to check metadata (existence/access level), 
    // then we validate access. To do this safely without service_role exposure, 
    // we can use a specific RPC or just try to fetch with current user.

    // Let's stick to standard client for now. If RLS returns nothing, it's a 404.
    // Ideally, we'd want to prompt login if it's a valid code but requires auth.
    // Use 'active' check.

    let { data: qrCode, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', code)
        .single()

    // If not found via standard RLS, it might be because we are ANON and the code is AUTHENTICATED.
    // Let's handle that specific case if the user is not logged in.
    if (!qrCode && !user) {
        // We can't distinguish "doesn't exist" from "exists but requires auth" easily with RLS alone hiding it.
        // For User Experience, let's redirect to login passing the return URL.
        // This is a safe default behavior for "unknown" paths in a private app details context.
        return redirect(`/login?returnTo=/qr/${code}`)
    }

    if (!qrCode || error) {
        return notFound()
    }

    // 2. Check strict Access Levels (redundant to RLS usually but good for specific error messages)
    if (qrCode.access_level === 'private' && qrCode.created_by !== user?.id) {
        return notFound()
    }

    if (!qrCode.active) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 text-center">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-red-500">Code Inactive</h1>
                    <p className="text-neutral-400">This QR code has been deactivated.</p>
                </div>
            </div>
        )
    }

    // 3. Increment Clicks (Fire and forget, don't await blocking the user)
    // We strictly use RPC or simple update.
    // 3. Increment Clicks (Fire and forget, don't await blocking the user)
    // We strictly use RPC or simple update.
    const { error: rpcError } = await (supabase.rpc as any)('increment_qr_clicks', { code_id: code })

    if (rpcError) {
        // Fallback if RPC doesn't exist yet
        await supabase
            .from('qr_codes')
            .update({ clicks: (qrCode.clicks || 0) + 1 })
            .eq('code', code)
    }

    // 4. Redirect
    // Ensure target url is absolute if external, or relative if internal
    let target = qrCode.target_url
    if (!target.startsWith('http') && !target.startsWith('/')) {
        target = `/${target}`
    }

    return redirect(target)
}
