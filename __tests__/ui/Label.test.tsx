import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/Label'

describe('Label Component', () => {
  it('should render children correctly', () => {
    render(<Label>Username</Label>)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('should render as a label element', () => {
    const { container } = render(<Label>Label</Label>)
    expect(container.querySelector('label')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<Label>Default Styles</Label>)
    const label = container.querySelector('label') as HTMLElement
    expect(label.className).toContain('block')
    expect(label.className).toContain('text-sm')
    expect(label.className).toContain('font-medium')
    expect(label.className).toContain('text-gray-300')
    expect(label.className).toContain('mb-2')
  })

  it('should merge custom className', () => {
    const { container } = render(<Label className="custom-label">Custom</Label>)
    const label = container.querySelector('label') as HTMLElement
    expect(label.className).toContain('custom-label')
    expect(label.className).toContain('text-sm')
  })

  it('should properly override default classes with custom className', () => {
    const { container } = render(<Label className="text-white">Custom Color</Label>)
    const label = container.querySelector('label') as HTMLElement
    expect(label.className).toContain('text-white')
    expect(label.className).not.toContain('text-gray-300')
  })

  it('should handle htmlFor attribute', () => {
    const { container } = render(<Label htmlFor="input-id">Label Text</Label>)
    const label = container.querySelector('label') as HTMLLabelElement
    expect(label.htmlFor).toBe('input-id')
  })

  it('should handle nested elements in children', () => {
    render(
      <Label>
        <span>Required</span> Field
      </Label>
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Field')).toBeInTheDocument()
  })

  it('should work with form inputs', () => {
    const { container } = render(
      <div>
        <Label htmlFor="email">Email Address</Label>
        <input id="email" type="email" />
      </div>
    )
    const label = container.querySelector('label') as HTMLElement
    const input = container.querySelector('input') as HTMLElement
    expect(label.htmlFor).toBe('email')
    expect(input.id).toBe('email')
  })

  it('should handle React node children', () => {
    render(
      <Label>
        <strong>Important</strong> Label
      </Label>
    )
    expect(screen.getByText('Important')).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  it('should support data attributes', () => {
    const { container } = render(
      <Label data-testid="custom-label">Test Label</Label>
    )
    const label = container.querySelector('label') as HTMLElement
    expect(label).toHaveAttribute('data-testid', 'custom-label')
  })

  it('should be accessible with aria attributes', () => {
    const { container } = render(
      <Label aria-required="true" htmlFor="field">
        Required Field
      </Label>
    )
    const label = container.querySelector('label') as HTMLElement
    expect(label.getAttribute('aria-required')).toBe('true')
  })

  it('should handle className override for spacing', () => {
    const { container } = render(<Label className="mb-4">Larger Margin</Label>)
    const label = container.querySelector('label') as HTMLElement
    expect(label.className).toContain('mb-4')
    expect(label.className).not.toContain('mb-2')
  })

  it('should handle className override for text size', () => {
    const { container } = render(<Label className="text-base">Larger Text</Label>)
    const label = container.querySelector('label') as HTMLElement
    expect(label.className).toContain('text-base')
    expect(label.className).not.toContain('text-sm')
  })

  it('should render with inline content', () => {
    render(
      <Label>
        Name <span style={{ color: 'red' }}>*</span>
      </Label>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
