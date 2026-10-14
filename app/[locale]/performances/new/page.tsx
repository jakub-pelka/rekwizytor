import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
import { redirect } from 'next/navigation'
import { loadVenues } from '@/lib/venues'
import { CreatePerformanceForm } from '@/components/performances/CreatePerformanceForm'

export default async function NewPerformancePage() {
    const supabase = await createClient()
    // Edycja tylko z prawem zapisu w bieżącym teatrze (lib/access); podgląd i niezalogowani wracają do widoku.
    if (!(await getAccess(supabase)).canWrite) redirect('/performances')
    return <CreatePerformanceForm venues={await loadVenues(supabase)} />
}
