/** @jest-environment node */
import { deleteTerm, updateTerm } from '@/app/actions/terms'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))

import { createClient } from '@/utils/supabase/server'

type Calls = { op: string; table: string }[]

// Atrapa klienta Supabase: każde zapytanie zwraca to, co podano w `results[tabela.operacja]`.
function fakeClient(results: Record<string, { data?: unknown; error?: unknown }>, calls: Calls = []) {
    const builder = (table: string) => {
        let op = 'select'
        const chain: Record<string, unknown> = {
            update: () => { op = 'update'; return chain },
            delete: () => { op = 'delete'; return chain },
            select: () => chain,
            eq: () => chain,
            maybeSingle: () => Promise.resolve(results[`${table}.${op}`] ?? { data: null, error: null }),
            then: (resolve: (v: unknown) => void) => { calls.push({ op, table }); resolve(results[`${table}.${op}`] ?? { data: [], error: null }) },
        }
        return chain
    }
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u' } } }) },
        from: builder,
    }
}

const input = { id: 't1', performanceId: 'p1', date: '2026-10-24', time: '19:30', kind: 'show' as const }

describe('deleteTerm', () => {
    it('0 usuniętych wierszy (RLS) to błąd, nie cichy sukces', async () => {
        const calls: Calls = []
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.delete': { data: [], error: null } }, calls))
        expect(await deleteTerm('t1')).toEqual({ ok: false, error: 'Nie masz uprawnień do usunięcia tego terminu.' })
        expect(calls.some(c => c.table === 'scene_checklists')).toBe(false)
    })

    it('usunięty wiersz: sukces', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.delete': { data: [{ id: 't1' }], error: null } }))
        expect(await deleteTerm('t1')).toEqual({ ok: true })
    })

    it('błąd bazy: komunikat po polsku', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.delete': { data: null, error: { message: 'x' } } }))
        expect(await deleteTerm('t1')).toEqual({ ok: false, error: 'Nie udało się usunąć terminu. Spróbuj jeszcze raz.' })
    })
})

describe('updateTerm', () => {
    it('0 zmienionych wierszy (RLS) to błąd, nie cichy sukces', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.update': { data: [], error: null } }))
        expect(await updateTerm(input)).toEqual({ ok: false, error: 'Nie masz uprawnień do zmiany tego terminu.' })
    })

    it('zmieniony wiersz: sukces', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.update': { data: [{ id: 't1' }], error: null } }))
        expect(await updateTerm(input)).toEqual({ ok: true, id: 't1' })
    })

    it('zdublowana godzina: komunikat o duplikacie', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'show_lists.update': { data: null, error: { code: '23505' } } }))
        expect(await updateTerm(input)).toEqual({ ok: false, error: 'Ten spektakl ma już termin o tej godzinie.' })
    })
})
