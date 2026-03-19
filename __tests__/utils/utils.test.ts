import { cn } from '@/utils/cn'
import { FEATURES, isFeatureEnabled } from '@/utils/features'

// Mock nanoid to avoid ESM issues
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'ABC123',
}))

import { generateShortId } from '@/utils/shortId'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'visible')
      expect(result).toContain('base')
      expect(result).toContain('visible')
      expect(result).not.toContain('hidden')
    })

    it('should merge Tailwind conflicts correctly', () => {
      const result = cn('p-4', 'p-6')
      expect(result).toBe('p-6')
    })

    it('should handle array inputs', () => {
      const result = cn(['text-sm', 'font-bold'])
      expect(result).toContain('text-sm')
      expect(result).toContain('font-bold')
    })
  })

  describe('generateShortId', () => {
    it('should be defined and callable', () => {
      expect(generateShortId).toBeDefined()
      expect(typeof generateShortId).toBe('function')
    })

    it('should generate an ID', () => {
      const id = generateShortId()
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
    })
  })

  describe('Features', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    describe('FEATURES constant', () => {
      it('should export feature flags', () => {
        expect(FEATURES).toHaveProperty('EXPERIMENTAL_MAPPING')
        expect(FEATURES.EXPERIMENTAL_MAPPING).toBe('experimental_mapping')
      })
    })

    describe('isFeatureEnabled', () => {
      it('should return false when feature is disabled', () => {
        delete process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAPPING
        const result = isFeatureEnabled('EXPERIMENTAL_MAPPING')
        expect(result).toBe(false)
      })

      it('should return true when feature is enabled', () => {
        process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAPPING = 'true'
        const result = isFeatureEnabled('EXPERIMENTAL_MAPPING')
        expect(result).toBe(true)
      })

      it('should return false for unknown features', () => {
        const result = isFeatureEnabled('UNKNOWN' as any)
        expect(result).toBe(false)
      })
    })
  })
})
