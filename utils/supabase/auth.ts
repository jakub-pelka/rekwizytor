import { createClient } from './server'

/**
 * Check if the current user is authenticated
 * Returns null if not authenticated, user object if authenticated
 */
export async function getCurrentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

/**
 * Check if the current user is an admin
 * Returns false if not authenticated or not admin
 */
export async function isAdmin() {
    const user = await getCurrentUser()
    if (!user) return false

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return profile?.role === 'admin'
}

/**
 * Check if user is in read-only mode (not authenticated)
 */
export async function isReadOnly() {
    const user = await getCurrentUser()
    return !user
}
