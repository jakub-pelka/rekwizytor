import { createClient } from '@/utils/supabase/server'
import { loadVenues } from '@/lib/venues'
import { CreatePerformanceForm } from '@/components/performances/CreatePerformanceForm'

export default async function NewPerformancePage() {
    const supabase = await createClient()
    return <CreatePerformanceForm venues={await loadVenues(supabase)} />
}
