import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import LightRays from '@/components/ui/LightRays'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export default async function ForgotPasswordPage() {
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

            <div className="mb-8 relative h-32 w-80 z-10">
                <Image
                    src="/brand/rekwizytor-logo-pion-dark.svg"
                    alt="Rekwizytor"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            <ForgotPasswordForm />
        </div>
    )
}
