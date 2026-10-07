import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { getTranslations } from 'next-intl/server';
import { UserApprovalList } from '@/components/settings/UserApprovalList'
import { PageHeader } from '@/components/ui/PageHeader'
import { Settings } from 'lucide-react'
import { AdminZoneWrapper } from '@/components/settings/AdminZoneWrapper'
import { MotionSetting } from '@/components/settings/MotionSetting'

export default async function SettingsPage() {
    const supabase = await createClient()
    const t = await getTranslations('Settings');

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto text-white">
            <PageHeader
                title={t('title')}
                subtitle={t('description')}
                icon={<Settings className="w-6 h-6 text-white" />}
                iconColor="text-purple-400"
            />

            <UserApprovalList />

            <MotionSetting />

            <SettingsForm user={{ ...profile, email: user.email || undefined }} />

            {profile && <AdminZoneWrapper role={profile.role as string} />}
        </div>
    )
}
