import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Keep-alive endpoint to prevent Supabase free tier auto-pause
 * Supabase pauses inactive databases after 7 days
 *
 * This endpoint should be called periodically (every 6 days recommended)
 * via Vercel Cron or external monitoring service
 */
export async function GET() {
    try {
        const supabase = await createClient()

        // Simple ping query to keep database active
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found (acceptable for empty table)
            console.error('Keep-alive error:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Database is active'
        })
    } catch (error) {
        console.error('Keep-alive error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to ping database' },
            { status: 500 }
        )
    }
}

// Allow unauthenticated access for cron jobs
export const dynamic = 'force-dynamic'
