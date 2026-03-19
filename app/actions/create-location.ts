'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLocation(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const type = formData.get('type') as string

    if (!name) return { error: 'Nazwa wymagana' }

    try {
        const { error } = await supabase
            .from('locations')
            .insert({
                name,
                // Cast to any to bypass strict type check for server action, 
                // but use a valid enum value 'other' as fallback
                type: (type || 'other') as any,
                description: 'Utworzono w module mapowania'
            })

        if (error) throw error

        revalidatePath('/mapping')
        return { success: true }
    } catch (error) {
        console.error('Failed to create location:', error)
        return { error: 'Błąd tworzenia lokalizacji' }
    }
}
