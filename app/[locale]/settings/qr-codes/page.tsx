import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { QrCodesManager } from '@/components/settings/QrCodesManager'
import { getQrCodes } from '@/app/actions/qr-codes'
import { PageHeader } from '@/components/ui/PageHeader'
import { QrCode } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export const metadata = {
    title: 'QR Code Manager | Rekwizytor',
    description: 'Manage universal QR code redirects',
}

export default async function QrCodesPage() {
    const t = await getTranslations('QrManager')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    try {
        const codes = await getQrCodes()

        return (
            <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto text-white">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                    icon={<QrCode className="w-6 h-6 text-white" />}
                    iconColor="text-purple-400"
                    backLink="/settings"
                />

                <div className="max-w-4xl">
                    <QrCodesManager initialCodes={codes} />
                </div>
            </div>
        )
    } catch (error) {
        console.error('Failed to fetch QR codes:', error)
        // Fallback if table doesn't exist yet
        return (
            <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto text-white">
                <PageHeader
                    title="QR Code Manager"
                    subtitle="Feature Unavailable"
                    icon={<QrCode className="w-6 h-6 text-white" />}
                    iconColor="text-neutral-400"
                    backLink="/settings"
                />
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200">
                    <h3 className="font-bold mb-2">Database Setup Required</h3>
                    <p>The QR Code system is not yet initialized in the database.</p>
                    <p className="mt-2 text-sm opacity-70">Please run the migration `20260108_create_qr_codes.sql` in your Supabase SQL Editor.</p>
                </div>
            </div>
        )
    }
}
