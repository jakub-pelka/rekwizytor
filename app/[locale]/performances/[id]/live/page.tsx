import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { theatreNowNaive } from '@/lib/rk-format'

// Stary tryb na żywo (zadania scen) zastąpiła lista zadań terminu. Stare linki prowadzą do najbliższego terminu
// spektaklu, a gdy go nie ma, na ekran spektaklu.
export default async function LivePerformancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const locale = await getLocale()
    const supabase = await createClient()
    const { data } = await supabase
        .from('show_lists')
        .select('id')
        .eq('performance_id', id)
        .gte('show_date', theatreNowNaive().slice(0, 10))
        .order('show_date', { ascending: true })
        .limit(1)
        .maybeSingle()
    redirect(data ? `/${locale}/lists/${data.id}` : `/${locale}/performances/${id}`)
}
