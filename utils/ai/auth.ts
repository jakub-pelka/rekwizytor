import { createClient } from '@/utils/supabase/server'

// AI calls cost money - only signed-in users may trigger them.
export async function isAIAllowed(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user !== null
}
