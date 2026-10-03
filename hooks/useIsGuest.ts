import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useIsGuest(): boolean {
    const [isGuest, setIsGuest] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        let active = true

        supabase.auth.getUser()
            .then(({ data }) => {
                if (active) setIsGuest(!data.user)
            })
            .catch(() => {
                // Keep the default (signed-in UI) if the auth check fails
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsGuest(!session?.user)
        })

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])

    return isGuest
}
