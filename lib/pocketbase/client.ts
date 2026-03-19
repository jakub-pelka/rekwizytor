/**
 * PocketBase client for embedding tests system
 * 
 * Provides both client-side and server-side (admin) connections to PocketBase
 */

import PocketBase from 'pocketbase'

/**
 * Client-side PocketBase instance
 * Uses NEXT_PUBLIC_POCKETBASE_URL for browser access
 */
export function createPocketBaseClient() {
    const pb = new PocketBase(
        process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'
    )

    return pb
}

/**
 * Server-side PocketBase instance with admin authentication
 * Required for write operations and sensitive data access
 */
export async function createPocketBaseAdmin() {
    const pb = new PocketBase(
        process.env.POCKETBASE_URL || 'http://localhost:8090'
    )

    try {
        await pb.collection('_superusers').authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL!,
            process.env.POCKETBASE_ADMIN_PASSWORD!
        )

        return pb
    } catch (error) {
        console.error('Failed to authenticate with PocketBase as admin:', error)
        throw new Error('PocketBase admin authentication failed')
    }
}
