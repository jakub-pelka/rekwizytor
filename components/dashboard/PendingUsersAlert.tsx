'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserPlus } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { StatusBanner } from '@/components/rk/StatusBanner'
import { useTranslations } from 'next-intl'

export function PendingUsersAlert() {
    const [pendingCount, setPendingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const t = useTranslations('Dashboard.PendingAlert')

    useEffect(() => {
        checkPendingUsers()
    }, [])

    const checkPendingUsers = async () => {
        try {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            if (error) throw error
            setPendingCount(count || 0)
        } catch (error) {
            console.error('Error checking pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || pendingCount === 0) return null

    return (
        <StatusBanner
            tone="pending"
            icon={<UserPlus />}
            side={<Link className="rk-btn rk-btn--ghost rk-btn--sm" href="/settings">{t('review')}</Link>}
        >
            {t('message', { count: pendingCount })}
        </StatusBanner>
    )
}
