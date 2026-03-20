'use client'

import { Info, LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'

export function ReadOnlyBanner() {
    const t = useTranslations('Dashboard')

    return (
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-blue-300 mb-1">
                        {t('readOnlyMode')}
                    </h3>
                    <p className="text-sm text-blue-200/80">
                        {t('readOnlyDescription')}
                    </p>
                </div>
                <Link href="/login">
                    <Button
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                    >
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('login')}
                    </Button>
                </Link>
            </div>
        </div>
    )
}
