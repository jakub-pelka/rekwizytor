import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge Component', () => {
  it('should render children correctly', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should apply default variant styles', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-blue-600')
    expect(badge.className).toContain('text-white')
  })

  it('should apply secondary variant styles', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-gray-700')
    expect(badge.className).toContain('text-gray-200')
  })

  it('should apply destructive variant styles', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-red-600')
    expect(badge.className).toContain('text-white')
  })

  it('should apply outline variant styles', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('border')
    expect(badge.className).toContain('border-gray-600')
    expect(badge.className).toContain('text-gray-300')
  })

  it('should apply base styles to all variants', () => {
    const { container } = render(<Badge>Base Styles</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('inline-flex')
    expect(badge.className).toContain('items-center')
    expect(badge.className).toContain('px-2.5')
    expect(badge.className).toContain('py-0.5')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('text-xs')
    expect(badge.className).toContain('font-medium')
  })

  it('should merge custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
    // Should still have base classes
    expect(badge.className).toContain('inline-flex')
  })

  it('should render as a span element', () => {
    const { container } = render(<Badge>Span</Badge>)
    expect(container.firstChild).toHaveProperty('tagName', 'SPAN')
  })

  it('should handle React node children', () => {
    render(
      <Badge>
        <span data-testid="icon">✓</span>
        <span>Success</span>
      </Badge>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should properly override Tailwind classes with custom className', () => {
    const { container } = render(<Badge className="bg-purple-500">Custom BG</Badge>)
    const badge = container.firstChild as HTMLElement
    // Custom bg should override default bg-blue-600
    expect(badge.className).toContain('bg-purple-500')
    expect(badge.className).not.toContain('bg-blue-600')
  })
})
