import { createClient } from '@/utils/supabase/server'
import { ManageScenesForm } from '@/components/performances/ManageScenesForm'
import { notFound } from 'next/navigation'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

type Scene = Database['public']['Tables']['scenes']['Row']

export default async function ManageScenesPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ManageScenes')

    // Fetch production details
    const { data: production } = await supabase
        .from('performances')
        .select('title, color')
        .eq('id', id)
        .single()

    if (!production) {
        notFound()
    }

    // Fetch scenes
    const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('performance_id', id)
        .order('scene_number', { ascending: true })

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            <ManageScenesForm
                performanceId={id}
                initialScenes={scenes?.map((s: Scene) => ({ ...s, act_number: s.act_number ?? 1 })) || []}
                performanceColor={production.color}
                pageTitle={t('title')}
                pageSubtitle={t('subtitle')}
            />
        </div>
    )
}
