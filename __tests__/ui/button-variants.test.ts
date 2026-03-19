import { buttonVariants, variants } from '@/components/ui/button-variants'

describe('Button Variants', () => {
  describe('buttonVariants function', () => {
    it('should return default primary medium button classes', () => {
      const result = buttonVariants()
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-center')
      expect(result).toContain('rounded-md')
      expect(result).toContain('font-medium')
      expect(result).toContain('transition-colors')
      expect(result).toContain('from-burgundy-light')
      expect(result).toContain('to-burgundy-main')
      expect(result).toContain('h-10')
      expect(result).toContain('px-4')
    })

    it('should apply secondary variant', () => {
      const result = buttonVariants({ variant: 'secondary' })
      expect(result).toContain('bg-neutral-800')
      expect(result).toContain('text-neutral-200')
    })

    it('should apply outline variant', () => {
      const result = buttonVariants({ variant: 'outline' })
      expect(result).toContain('bg-transparent')
      expect(result).toContain('border-neutral-700')
    })

    it('should apply ghost variant', () => {
      const result = buttonVariants({ variant: 'ghost' })
      expect(result).toContain('bg-transparent')
      expect(result).toContain('text-neutral-400')
    })

    it('should apply destructive variant', () => {
      const result = buttonVariants({ variant: 'destructive' })
      expect(result).toContain('bg-red-900/50')
      expect(result).toContain('text-red-200')
    })

    it('should apply link variant', () => {
      const result = buttonVariants({ variant: 'link' })
      expect(result).toContain('text-burgundy-light')
      expect(result).toContain('underline-offset-4')
    })

    it('should apply glassy variant', () => {
      const result = buttonVariants({ variant: 'glassy' })
      expect(result).toContain('bg-white/10')
      expect(result).toContain('backdrop-blur-sm')
      expect(result).toContain('rounded-xl')
    })

    it('should apply glassy-primary variant', () => {
      const result = buttonVariants({ variant: 'glassy-primary' })
      expect(result).toContain('bg-burgundy-main/60')
      expect(result).toContain('border-burgundy-main/50')
    })

    it('should apply glassy-danger variant', () => {
      const result = buttonVariants({ variant: 'glassy-danger' })
      expect(result).toContain('bg-red-900/60')
      expect(result).toContain('border-red-500/30')
    })

    it('should apply glassy-secondary variant', () => {
      const result = buttonVariants({ variant: 'glassy-secondary' })
      expect(result).toContain('bg-neutral-800/60')
    })

    it('should apply glassy-success variant', () => {
      const result = buttonVariants({ variant: 'glassy-success' })
      expect(result).toContain('bg-emerald-600/20')
      expect(result).toContain('border-emerald-600/30')
    })

    it('should apply small size', () => {
      const result = buttonVariants({ size: 'sm' })
      expect(result).toContain('h-8')
      expect(result).toContain('px-3')
      expect(result).toContain('text-xs')
    })

    it('should apply medium size', () => {
      const result = buttonVariants({ size: 'md' })
      expect(result).toContain('h-10')
      expect(result).toContain('px-4')
      expect(result).toContain('text-sm')
    })

    it('should apply large size', () => {
      const result = buttonVariants({ size: 'lg' })
      expect(result).toContain('h-12')
      expect(result).toContain('px-8')
      expect(result).toContain('text-base')
    })

    it('should apply icon size', () => {
      const result = buttonVariants({ size: 'icon' })
      expect(result).toContain('h-9')
      expect(result).toContain('w-9')
      expect(result).toContain('p-0')
    })

    it('should merge custom className', () => {
      const result = buttonVariants({ className: 'custom-class' })
      expect(result).toContain('custom-class')
    })

    it('should combine variant, size, and className', () => {
      const result = buttonVariants({
        variant: 'destructive',
        size: 'lg',
        className: 'my-custom-class'
      })
      expect(result).toContain('bg-red-900/50')
      expect(result).toContain('h-12')
      expect(result).toContain('my-custom-class')
    })

    it('should handle Tailwind class merging correctly', () => {
      // Test that duplicate Tailwind classes are properly merged
      const result = buttonVariants({ className: 'px-8' })
      // Should only have one px- class (the custom one should override)
      const pxMatches = result.match(/px-\d+/g)
      expect(pxMatches).toBeTruthy()
      // Should have merged to just one px- class (px-8 from className overrides default px-4)
      expect(pxMatches!.length).toBe(1)
      expect(result).toContain('px-8')
    })
  })

  describe('variants object', () => {
    it('should export variant options', () => {
      expect(variants.variant).toBeDefined()
      expect(variants.variant.primary).toBeDefined()
      expect(variants.variant.secondary).toBeDefined()
      expect(variants.variant.outline).toBeDefined()
      expect(variants.variant.ghost).toBeDefined()
      expect(variants.variant.destructive).toBeDefined()
      expect(variants.variant.link).toBeDefined()
    })

    it('should export size options', () => {
      expect(variants.size).toBeDefined()
      expect(variants.size.sm).toBeDefined()
      expect(variants.size.md).toBeDefined()
      expect(variants.size.lg).toBeDefined()
      expect(variants.size.icon).toBeDefined()
    })

    it('should have all glassy variants', () => {
      expect(variants.variant.glassy).toBeDefined()
      expect(variants.variant['glassy-primary']).toBeDefined()
      expect(variants.variant['glassy-danger']).toBeDefined()
      expect(variants.variant['glassy-secondary']).toBeDefined()
      expect(variants.variant['glassy-success']).toBeDefined()
    })
  })
})
