import { getTranslations } from 'next-intl/server'
import { Clock } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default async function WaitingPage() {
    const t = await getTranslations('Waiting')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is already approved
    const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

    if (profile?.status === 'approved') {
        redirect('/')
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-200 overflow-hidden">
            <div className="w-full max-w-md text-center space-y-6 relative z-10">
                <div className="flex justify-center">
                    <div className="rounded-full bg-yellow-900/20 p-4 text-yellow-500">
                        <Clock className="h-12 w-12" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white">
                    {t('title')}
                </h1>

                <p className="text-neutral-400">
                    {t('description')}
                </p>
            </div>

            {/* Bottom Left - Sign Out */}
            <div className="absolute bottom-8 left-8 z-20">
                <form action={signOut}>
                    <button
                        className="text-sm text-neutral-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                        type="submit"
                    >
                        <span className="text-xs uppercase tracking-wider">{t('signOut')}</span>
                    </button>
                </form>
            </div>

            {/* Bottom Right - Logo */}
            <div className="absolute bottom-8 right-8 z-20 opacity-50 hover:opacity-100 transition-opacity">
                <div className="relative h-8 w-32">
                    <Image
                        src="/brand/rekwizytor-logo-dark.svg"
                        alt="Rekwizytor"
                        fill
                        className="object-contain object-right"
                    />
                </div>
            </div>
        </div>
    )
}
