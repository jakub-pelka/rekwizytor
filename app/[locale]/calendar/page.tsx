import { createClient } from '@/utils/supabase/server'
import { getAccess } from '@/lib/access'
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
    // Zapis tylko dla kierownika i rekwizytora bieżącego teatru (lib/access); podgląd i niezalogowani oglądają.
    const access = await getAccess(supabase)
    const { from, to, days } = calendarRange(view, anchor)
    const [terms, performancesResult, upcomingResult] = await Promise.all([
        loadCalendar(supabase, from, to),
        supabase.from('performances').select('id, title').is('deleted_at', null).neq('status', 'archived').order('title'),
        // Pierwszy termin po widocznym okresie: pusty tydzień mówi, kiedy jest następny, zamiast odsyłać na ślepo dalej.
        supabase
            .from('show_lists')
            .select('show_date, performance:performances!inner(deleted_at)')
            .is('performance.deleted_at', null)
            .gt('show_date', dayKey(to))
            .order('show_date', { ascending: true })
            .limit(1),
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
            upcoming={upcomingResult.data?.[0]?.show_date?.slice(0, 10) ?? null}
            actions={<CalendarActions performances={performancesResult.data ?? []} canEdit={access.canWrite} />}
        />
    )
}
