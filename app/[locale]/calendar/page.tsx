import { createClient } from '@/utils/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import { CalendarActions } from '@/components/calendar/CalendarActions'
import { calendarRange, dayKey, loadCalendar, parseAnchor, shiftAnchor, type CalendarKind, type CalendarView as View } from '@/lib/calendar'
import { theatreNow } from '@/lib/rk-format'

type Props = { searchParams: Promise<{ view?: string; kind?: string; date?: string }> }

// Kalendarz terminów: lista z osią czasu (domyślnie) albo miesiąc (README, aktualizacja 8.10).
export default async function CalendarPage({ searchParams }: Props) {
    const params = await searchParams
    const view: View = params.view === 'month' ? 'month' : 'list'
    const kind: CalendarKind = params.kind === 'show' || params.kind === 'rehearsal' ? params.kind : 'all'
    const today = theatreNow()
    const anchor = parseAnchor(params.date, today)

    const supabase = await createClient()
    const { from, to, days } = calendarRange(view, anchor)
    const [terms, performancesResult, userResult] = await Promise.all([
        loadCalendar(supabase, from, to),
        supabase.from('performances').select('id, title').is('deleted_at', null).neq('status', 'archived').order('title'),
        supabase.auth.getUser(),
    ])

    return (
        <CalendarView
            view={view}
            kind={kind}
            anchor={dayKey(anchor)}
            prev={dayKey(shiftAnchor(view, anchor, -1))}
            next={dayKey(shiftAnchor(view, anchor, 1))}
            days={days.map(dayKey)}
            terms={terms}
            today={dayKey(today)}
            actions={<CalendarActions performances={performancesResult.data ?? []} canEdit={!!userResult.data.user} />}
        />
    )
}
