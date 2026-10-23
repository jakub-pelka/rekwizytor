/** @jest-environment node */
import { canResumeLive, isLiveNow, LIVE_WINDOW } from '@/lib/performance-structure'

// Spektakl 23.10.2026 o 19:00 czasu teatru (CEST, +02:00). `show_date` i „teraz” są czasem teatru bez strefy,
// a chwile zapisu (live_act_started_at, live_ended_at) to timestamptz, czyli prawdziwe chwile.
const SHOW = '2026-10-23T19:00:00'
const HOUR = 3600_000
const showInstant = Date.UTC(2026, 9, 23, 17, 0, 0)
const stamp = (h: number) => new Date(showInstant + h * HOUR).toISOString()
const now = (h: number) => new Date(showInstant + 2 * HOUR + h * HOUR).toISOString().slice(0, 19)

describe('isLiveNow z zakończeniem', () => {
    it('bez zakończenia działa jak dotąd', () => {
        expect(isLiveNow('show', SHOW, now(1))).toBe(true)
        expect(isLiveNow('show', SHOW, now(1), null, null)).toBe(true)
    })

    it('przed zakończeniem tryb trwa, w trakcie okna i po zakończeniu jest wyłączony', () => {
        const ended = stamp(2)
        expect(isLiveNow('show', SHOW, now(1.5))).toBe(true)
        expect(isLiveNow('show', SHOW, now(2), null, ended)).toBe(false)
        expect(isLiveNow('show', SHOW, now(3.5), null, ended)).toBe(false)
    })

    it('zakończenie z poprzedniego dnia nie blokuje dzisiejszego okna', () => {
        expect(isLiveNow('show', SHOW, now(1), null, stamp(-22))).toBe(true)
    })

    it('zakończenie sprzed ręcznego startu nie blokuje okna otwartego tym startem', () => {
        expect(isLiveNow('show', SHOW, now(-0.5), stamp(-1), stamp(-2))).toBe(true)
    })

    it('zakończenie po ręcznym starcie wyłącza tryb jeszcze przed godziną spektaklu', () => {
        expect(isLiveNow('show', SHOW, now(-0.5), stamp(-1), stamp(-0.75))).toBe(false)
    })

    it('okno nadal trwa 4 h od godziny spektaklu i dotyczy tylko spektakli', () => {
        expect(isLiveNow('show', SHOW, now(LIVE_WINDOW / HOUR + 0.01))).toBe(false)
        expect(isLiveNow('rehearsal', SHOW, now(1))).toBe(false)
    })

    it('pozwala wznowić tryb na żywo tylko dla zakończonego spektaklu w trakcie okna 4 h (także po ustawieniu live_act_started_at)', () => {
        const ended = stamp(1)
        expect(canResumeLive('show', SHOW, now(1.5), ended)).toBe(true)
        expect(canResumeLive('show', SHOW, now(1.5), ended, stamp(0.5))).toBe(true)
        expect(canResumeLive('show', SHOW, now(-0.5), stamp(-0.75), stamp(-1))).toBe(true)
        expect(canResumeLive('show', SHOW, now(1.5), null)).toBe(false)
        expect(canResumeLive('show', SHOW, now(-0.5), ended)).toBe(false)
        expect(canResumeLive('show', SHOW, now(LIVE_WINDOW / HOUR + 0.01), ended)).toBe(false)
        expect(canResumeLive('show', SHOW, now(1.5), stamp(-22))).toBe(false)
        expect(canResumeLive('rehearsal', SHOW, now(1.5), ended)).toBe(false)
    })
})
