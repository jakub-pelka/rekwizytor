import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import LightRays from '@/components/ui/LightRays'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export default async function UpdatePasswordPage() {
    const t = await getTranslations('Login')

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-200 relative overflow-hidden">
            <LightRays
                raysOrigin="top-center"
                raysColor="#cfcfcf"
                raysSpeed={0.2}
                lightSpread={2.0}
                rayLength={1.0}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0}
                className="opacity-40"
            />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-8 relative h-32 w-80">
                        <Image
                            src="/brand/rekwizytor-logo-pion-dark.svg"
                            alt="Rekwizytor"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('resetPassword')}</h2>
                </div>

                <ChangePasswordForm redirectTo="/login" />
            </div>
        </div>
    )
}
