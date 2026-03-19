import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { SceneTaskEditor } from '@/components/performances/SceneTaskEditor'
import { Edit } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'

type Props = {
    readonly params: Promise<{ readonly id: string }>
}

export default async function PerformanceTasksPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch performance and scenes
    const [performanceResult, scenesResult] = await Promise.all([
        supabase
            .from('performances')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('scenes')
            .select('*')
            .eq('performance_id', id)
            .order('act_number', { ascending: true })
            .order('scene_number', { ascending: true })
    ])

    const performance = performanceResult.data
    const scenes = scenesResult.data

    if (!performance) {
        notFound()
    }

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <PageHeader
                title={`Zadania: ${performance.title}`}
                subtitle="Zarządzaj zadaniami dla każdej sceny"
                icon={<Edit className="w-6 h-6 text-white" />}
                iconColor={performance.color || 'text-purple-400'}
            >
                <Link
                    href={`/performances/${id}/tasks`}
                    className={buttonVariants({ variant: 'glassy-secondary' })}
                >
                    Powrót
                </Link>
            </PageHeader>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                <SceneTaskEditor
                    performanceId={id}
                    scenes={scenes || []}
                />
            </div>
        </div>
    )
}
