import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { notFound, redirect } from 'next/navigation'
import { loadVenues } from '@/lib/venues'
import { EditPerformanceForm } from '@/components/performances/EditPerformanceForm'

type Props = {
    params: Promise<{ id: string }>
}

export default async function EditPerformancePage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    // Edycja tylko z prawem zapisu w bieżącym teatrze (lib/access); podgląd i niezalogowani wracają do widoku.
    if (!(await getAccess(supabase)).canWrite) redirect(`/performances/${id}`)

    const { data: performance } = await supabase
        .from('performances')
        .select('*')
        .eq('id', id)
        .single()

    if (!performance) {
        notFound()
    }

    return <EditPerformanceForm performance={performance} venues={await loadVenues(supabase)} />
}
