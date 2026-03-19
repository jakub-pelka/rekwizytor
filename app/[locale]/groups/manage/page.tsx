import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { GroupKanbanManager } from '@/components/groups/GroupKanbanManager'
import { PageHeader } from '@/components/ui/PageHeader'
import { Settings } from 'lucide-react'

export default async function GroupsManagePage() {
    const supabase = await createClient()

    const { data: groups } = await supabase
        .from('groups')
        .select('id, name, icon, location_id, locations(id, name)')
        .order('name')

    const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .neq('name', 'Nowe Pomieszczenie')
        .order('name')



    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Zarządzaj grupami"
                subtitle="Edytuj strukturę, nazwy i lokalizacje"
                icon={<Settings className="w-6 h-6 text-white" />}
                iconColor="text-blue-400"
            />

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <GroupKanbanManager
                    initialGroups={groups || []}
                    locations={locations || []}
                />
            </div>
        </div>
    )
}
