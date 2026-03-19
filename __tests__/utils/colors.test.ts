import { COLORS, DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'

describe('Colors Utilities', () => {
  describe('COLORS constant', () => {
    it('should export color configuration object', () => {
      expect(COLORS).toBeDefined()
      expect(typeof COLORS).toBe('object')
    })

    it('should have BRAND colors', () => {
      expect(COLORS.BRAND).toBeDefined()
      expect(COLORS.BRAND.BURGUNDY).toBeDefined()
      expect(COLORS.BRAND.BURGUNDY).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should have ENTITIES configuration', () => {
      expect(COLORS.ENTITIES).toBeDefined()
      expect(COLORS.ENTITIES.GROUP).toBeDefined()
      expect(COLORS.ENTITIES.NOTE).toBeDefined()
      expect(COLORS.ENTITIES.PRODUCTION).toBeDefined()
    })

    it('should have valid hex colors in all entities', () => {
      expect(COLORS.ENTITIES.GROUP.DEFAULT).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(COLORS.ENTITIES.GROUP.FALLBACK_CYAN).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(COLORS.ENTITIES.NOTE.DEFAULT).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(COLORS.ENTITIES.PRODUCTION.DEFAULT).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('DEFAULT_GROUP_COLOR', () => {
    it('should be a valid hex color', () => {
      expect(DEFAULT_GROUP_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should match BRAND.BURGUNDY', () => {
      expect(DEFAULT_GROUP_COLOR).toBe(COLORS.BRAND.BURGUNDY)
    })

    it('should match ENTITIES.GROUP.DEFAULT', () => {
      expect(DEFAULT_GROUP_COLOR).toBe(COLORS.ENTITIES.GROUP.DEFAULT)
    })
  })
})

