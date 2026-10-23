/** @jest-environment node */
import { approveUser } from '@/app/actions/admin/approve-user'
import type { TheatreRole } from '@/lib/access'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))

import { createClient } from '@/utils/supabase/server'

// Atrapa klienta Supabase: rpc zapisuje wywołania i zwraca podany wynik.
function fakeClient(rpcResult: { data?: unknown; error?: { message: string } | null } = { data: null, error: null }, signedIn = true) {
    const rpc = jest.fn(() => Promise.resolve(rpcResult))
    const client = {
        auth: { getUser: () => Promise.resolve({ data: { user: signedIn ? { id: 'manager' } : null }, error: null }) },
        rpc,
    }
    ;(createClient as jest.Mock).mockResolvedValue(client)
    return rpc
}

describe('approveUser', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {})
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => jest.restoreAllMocks())

    it('zatwierdzenie woła approve_pending_user z wybraną rolą', async () => {
        const rpc = fakeClient()
        expect(await approveUser('u1', 'approved', 'viewer')).toEqual({ success: true })
        expect(rpc).toHaveBeenCalledTimes(1)
        expect(rpc).toHaveBeenCalledWith('approve_pending_user', { p_user: 'u1', p_role: 'viewer' })
    })

    it('odrzucenie woła reject_pending_user bez roli', async () => {
        const rpc = fakeClient()
        expect(await approveUser('u1', 'rejected')).toEqual({ success: true })
        expect(rpc).toHaveBeenCalledWith('reject_pending_user', { p_user: 'u1' })
    })

    it('brak uprawnień w bazie daje polski komunikat', async () => {
        fakeClient({ error: { message: 'Zatwierdzać może tylko kierownik pracowni.' } })
        expect(await approveUser('u1', 'approved', 'member')).toEqual({ error: 'Zatwierdzać może tylko kierownik pracowni.' })
    })

    it('konto, które już nie czeka, daje polski komunikat', async () => {
        fakeClient({ error: { message: 'To konto nie czeka już na zatwierdzenie.' } })
        expect(await approveUser('u1', 'approved', 'member')).toEqual({ error: 'To konto nie czeka już na zatwierdzenie.' })
    })

    it('nieznany błąd bazy nie wycieka po angielsku', async () => {
        fakeClient({ error: { message: 'You are not authorized to change status' } })
        const r = await approveUser('u1', 'approved', 'member')
        expect(r).toEqual({ error: 'Nie udało się zapisać decyzji. Spróbuj jeszcze raz.' })
    })

    it('nieprawidłowa albo brakująca rola jest odrzucona przed wywołaniem bazy', async () => {
        const rpc = fakeClient()
        const bad = await approveUser('u1', 'approved', 'superadmin' as TheatreRole)
        const missing = await approveUser('u1', 'approved')
        expect(bad).toEqual({ error: 'Wybierz rolę: kierownik pracowni, rekwizytor albo podgląd.' })
        expect(missing).toEqual(bad)
        expect(rpc).not.toHaveBeenCalled()
    })

    it('nie zatwierdza samego siebie i nie woła bazy', async () => {
        const rpc = fakeClient()
        expect(await approveUser('manager', 'approved', 'admin')).toEqual({ error: 'Nie możesz zatwierdzić ani odrzucić własnego konta.' })
        expect(rpc).not.toHaveBeenCalled()
    })

    it('bez sesji: prośba o zalogowanie, baza nietknięta', async () => {
        const rpc = fakeClient({ data: null, error: null }, false)
        expect(await approveUser('u1', 'approved', 'member')).toEqual({ error: 'Zaloguj się, żeby zatwierdzać konta.' })
        expect(rpc).not.toHaveBeenCalled()
    })
})
