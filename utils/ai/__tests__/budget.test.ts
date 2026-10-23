/** @jest-environment node */
import { AIBudgetExceededError, getAIBudgetStatus, openAIBudget, recordAIUsage, toStatus } from '../budget'
import { costFromUsage, estimateCostUsd } from '../pricing'

const mockClient = { rpc: jest.fn(), from: jest.fn() }
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => mockClient }))

beforeEach(() => {
    mockClient.rpc.mockReset()
    mockClient.from.mockReset()
})

describe('koszt', () => {
    it('bierze koszt od dostawcy bez zmian', () => {
        expect(costFromUsage('google/gemini-3.5-flash-lite', { prompt_tokens: 1000, completion_tokens: 10, cost: 0.00042 }))
            .toEqual({ usd: 0.00042, source: 'provider' })
    })
    it('bez kosztu od dostawcy liczy z tokenów i cennika', () => {
        const c = costFromUsage('gpt-5.4-mini', { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 })
        expect(c.source).toBe('estimate')
        expect(c.usd).toBeCloseTo(0.8 + 3.2, 6)
    })
    it('nieznany model liczy drogo, nie za darmo', () => {
        expect(estimateCostUsd('nieznany/model', 1_000_000, 0)).toBeGreaterThan(1)
    })
    it('ujemny koszt od dostawcy jest odrzucony', () => {
        expect(costFromUsage('gpt-5.4-nano', { prompt_tokens: 0, completion_tokens: 0, cost: -1 }).source).toBe('estimate')
    })
})

describe('próg limitu', () => {
    it('ok poniżej 70%, ostrzeżenie od 70%, przekroczenie od 100%', () => {
        expect(toStatus(3, 2.09).level).toBe('ok')
        expect(toStatus(3, 2.1).level).toBe('warn')
        expect(toStatus(3, 2.99).level).toBe('warn')
        expect(toStatus(3, 3).level).toBe('exceeded')
        expect(toStatus(3, 4).level).toBe('exceeded')
    })
    it('limit 0 wyłącza AI', () => {
        expect(toStatus(0, 0).level).toBe('exceeded')
    })
})

describe('sprawdzenie przed wywołaniem', () => {
    it('odrzuca po przekroczeniu limitu', async () => {
        mockClient.rpc.mockResolvedValue({ data: [{ budget_usd: 3, spent_usd: 3.01 }], error: null })
        await expect(openAIBudget()).rejects.toBeInstanceOf(AIBudgetExceededError)
    })
    it('przepuszcza poniżej limitu', async () => {
        mockClient.rpc.mockResolvedValue({ data: [{ budget_usd: 3, spent_usd: 1 }], error: null })
        await expect(openAIBudget()).resolves.toMatchObject({ legacy: false })
    })
    it('przed migracją działa bez limitu', async () => {
        mockClient.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'brak funkcji' } })
        await expect(openAIBudget()).resolves.toMatchObject({ legacy: true })
    })
    it('inny błąd bazy zatrzymuje wywołanie', async () => {
        mockClient.rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'timeout' } })
        await expect(openAIBudget()).rejects.toThrow('limitu AI')
    })
    it('brak teatru zatrzymuje wywołanie', async () => {
        mockClient.rpc.mockResolvedValue({ data: [], error: null })
        await expect(getAIBudgetStatus(mockClient as never)).rejects.toBeInstanceOf(AIBudgetExceededError)
    })
})

describe('zapis zużycia', () => {
    it('zapisuje koszt i źródło', async () => {
        const insert = jest.fn().mockResolvedValue({ error: null })
        mockClient.from.mockReturnValue({ insert })
        await recordAIUsage({ supabase: mockClient as never, legacy: false }, {
            operation: 'scan_items', model: 'm', tokensInput: 10, tokensOutput: 5, cost: { usd: 0.01, source: 'provider' },
        })
        expect(mockClient.from).toHaveBeenCalledWith('ai_usage_logs')
        expect(insert).toHaveBeenCalledWith(expect.objectContaining({ cost_usd: 0.01, cost_source: 'provider', total_tokens: 15 }))
    })
    it('na bazie sprzed migracji pomija kolumny kosztu', async () => {
        const insert = jest.fn().mockResolvedValue({ error: null })
        mockClient.from.mockReturnValue({ insert })
        await recordAIUsage({ supabase: mockClient as never, legacy: true }, {
            operation: 'x', model: 'm', tokensInput: 1, tokensOutput: 1, cost: { usd: 1, source: 'estimate' },
        })
        expect(insert.mock.calls[0][0]).not.toHaveProperty('cost_usd')
    })
})
