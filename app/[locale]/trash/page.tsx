import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { TrashList } from '@/components/trash/TrashList'
import { MobileTop } from '@/components/rk/MobileTop'

export default async function TrashPage() {
    const supabase = await createClient()
    const t = await getTranslations('Trash')
    const tSettings = await getTranslations('Settings')

    // Usunięte spektakle (deleted_at); inne rzeczy w koszu nie lądują.
    const { data: deletedPerformances } = await supabase
        .from('performances')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

    return (
        <div>
            <MobileTop back={{ href: '/settings', label: tSettings('title') }} />
            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <div className="flex flex-col gap-1">
                        <h1 className="rk-page-header__title">{t('title')}</h1>
                        <p className="pl-meta">{t('subtitle')}</p>
                    </div>
                </header>

                <TrashList initialPerformances={deletedPerformances || []} />
            </div>
        </div>
    )
}
