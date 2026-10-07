import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ShortLinkPage({ params }: { params: Promise<{ shortId: string }> }) {
    const { shortId } = await params
    const supabase = await createClient()

    const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('short_id', shortId)
        .single()

    if (group) {
        redirect(`/pl/groups/${group.id}`)
    }

    // If not found, redirect to home or show 404
    redirect('/pl')
}
