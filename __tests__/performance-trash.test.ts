/** @jest-environment node */
import { deletePerformanceForever } from '@/app/actions/performance-trash'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/app/actions/unified-search', () => ({ refreshSearchIndex: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))

import { createClient } from '@/utils/supabase/server'

type Calls = { op: string; table: string; payload?: unknown }[]

// Atrapa klienta Supabase: każde zapytanie zwraca to, co podano w `results[tabela.operacja]`.
function fakeClient(results: Record<string, { data?: unknown; error?: unknown }>, isManager = true, calls: Calls = []) {
    const builder = (table: string) => {
        let op = 'select'
        let payload: unknown
        const chain: Record<string, unknown> = {
            update: (p: unknown) => { op = 'update'; payload = p; return chain },
            delete: () => { op = 'delete'; return chain },
            select: () => chain,
            eq: () => chain, in: () => chain,
            maybeSingle: () => { calls.push({ op, table }); return Promise.resolve(results[`${table}.${op}`] ?? { data: null, error: null }) },
            then: (resolve: (v: unknown) => void) => { calls.push({ op, table, payload }); resolve(results[`${table}.${op}`] ?? { data: [], error: null }) },
        }
        return chain
    }
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u' } } }) },
        from: builder,
        rpc: () => Promise.resolve({ data: isManager, error: null }),
    }
}

const perf = { data: { id: 'p1', title: 'Wesele', theatre_id: 't1' }, error: null }

describe('deletePerformanceForever', () => {
    it('zwykły rekwizytor: odmowa i żadna grupa nie zostaje ruszona', async () => {
        const calls: Calls = []
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({ 'performances.select': perf }, false, calls))
        const r = await deletePerformanceForever('p1')
        expect(r).toEqual({ ok: false, error: 'Usuwać na zawsze może tylko kierownik pracowni.' })
        expect(calls.some(c => c.table === 'groups')).toBe(false)
    })

    it('0 usuniętych wierszy to błąd, nie cichy sukces', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({
            'performances.select': perf, 'groups.select': { data: [], error: null }, 'performances.delete': { data: [], error: null },
        }))
        expect((await deletePerformanceForever('p1')).ok).toBe(false)
    })

    it('kierownik: automatyczna grupa znika, grupa z przedmiotami zostaje odpięta, spektakl usunięty', async () => {
        const calls: Calls = []
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({
            'performances.select': perf,
            'groups.select': { data: [{ id: 'g-auto', name: 'Wesele' }, { id: 'g-own', name: 'Kielichy' }, { id: 'g-same', name: 'Wesele' }], error: null },
            'group_items.select': { data: [{ group_id: 'g-same' }], error: null },
            'performances.delete': { data: [{ id: 'p1' }], error: null },
        }, true, calls))
        expect(await deletePerformanceForever('p1')).toEqual({ ok: true })
        expect(calls.find(c => c.table === 'groups' && c.op === 'update')?.payload).toEqual({ performance_id: null })
        expect(calls.some(c => c.table === 'groups' && c.op === 'delete')).toBe(true)
    })

    it('błąd bazy przy usuwaniu daje komunikat po polsku', async () => {
        ;(createClient as jest.Mock).mockResolvedValue(fakeClient({
            'performances.select': perf, 'groups.select': { data: [], error: null }, 'performances.delete': { data: null, error: { message: 'fk' } },
        }))
        const r = await deletePerformanceForever('p1')
        expect(r.ok).toBe(false)
        expect(r.error).toMatch(/Nie udało się usunąć/)
    })
})
