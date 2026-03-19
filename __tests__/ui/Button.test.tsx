import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('should render children correctly', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('should render as a button element', () => {
    const { container } = render(<Button>Button</Button>)
    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('should apply primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('from-burgundy-light')
    expect(button.className).toContain('to-burgundy-main')
    expect(button.className).toContain('text-white')
  })

  it('should apply secondary variant styles', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-neutral-800')
    expect(button.className).toContain('text-neutral-200')
  })

  it('should apply outline variant styles', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-transparent')
    expect(button.className).toContain('border')
    expect(button.className).toContain('border-neutral-700')
  })

  it('should apply ghost variant styles', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-transparent')
    expect(button.className).toContain('text-neutral-400')
  })

  it('should apply destructive variant styles', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-red-900/50')
    expect(button.className).toContain('text-red-200')
  })

  it('should apply link variant styles', () => {
    const { container } = render(<Button variant="link">Link</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('text-burgundy-light')
    expect(button.className).toContain('underline-offset-4')
  })

  it('should apply glassy variant styles', () => {
    const { container } = render(<Button variant="glassy">Glassy</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-white/10')
    expect(button.className).toContain('backdrop-blur-sm')
  })

  it('should apply glassy-primary variant styles', () => {
    const { container } = render(<Button variant="glassy-primary">Glassy Primary</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-burgundy-main/60')
    expect(button.className).toContain('backdrop-blur-sm')
  })

  it('should apply glassy-danger variant styles', () => {
    const { container } = render(<Button variant="glassy-danger">Glassy Danger</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-red-900/60')
    expect(button.className).toContain('backdrop-blur-sm')
  })

  it('should apply glassy-secondary variant styles', () => {
    const { container } = render(<Button variant="glassy-secondary">Glassy Secondary</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-neutral-800/60')
    expect(button.className).toContain('backdrop-blur-sm')
  })

  it('should apply glassy-success variant styles', () => {
    const { container } = render(<Button variant="glassy-success">Glassy Success</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('bg-emerald-600/20')
    expect(button.className).toContain('backdrop-blur-sm')
  })

  it('should apply md size by default', () => {
    const { container } = render(<Button>Default Size</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('h-10')
    expect(button.className).toContain('px-4')
    expect(button.className).toContain('text-sm')
  })

  it('should apply sm size styles', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('h-8')
    expect(button.className).toContain('px-3')
    expect(button.className).toContain('text-xs')
  })

  it('should apply lg size styles', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('h-12')
    expect(button.className).toContain('px-8')
    expect(button.className).toContain('text-base')
  })

  it('should apply icon size styles', () => {
    const { container } = render(<Button size="icon">+</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('h-9')
    expect(button.className).toContain('w-9')
    expect(button.className).toContain('p-0')
  })

  it('should apply base styles to all variants', () => {
    const { container } = render(<Button>Base Styles</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
    expect(button.className).toContain('justify-center')
    expect(button.className).toContain('rounded-md')
    expect(button.className).toContain('font-medium')
    expect(button.className).toContain('transition-colors')
  })

  it('should merge custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('custom-class')
    expect(button.className).toContain('inline-flex')
  })

  it('should properly override Tailwind classes with custom className', () => {
    const { container } = render(<Button className="h-16">Custom Height</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('h-16')
    expect(button.className).not.toContain('h-10')
  })

  it('should handle isLoading prop', () => {
    const { container } = render(<Button isLoading>Loading</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.disabled).toBe(true)
    // Loader icon should be present
    const loader = container.querySelector('svg')
    expect(loader).toBeInTheDocument()
    expect(loader?.getAttribute('class')).toContain('animate-spin')
  })

  it('should hide loader icon when not loading', () => {
    const { container } = render(<Button isLoading={false}>Not Loading</Button>)
    const loader = container.querySelector('svg[class*="animate-spin"]')
    expect(loader).not.toBeInTheDocument()
  })

  it('should disable button when isLoading is true', () => {
    const { container } = render(
      <Button isLoading>
        Loading
      </Button>
    )
    const button = container.querySelector('button') as HTMLElement
    expect(button).toBeDisabled()
  })

  it('should render left icon when provided and not loading', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">←</span>}>
        Button
      </Button>
    )
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('should hide left icon when loading', () => {
    const { container } = render(
      <Button isLoading leftIcon={<span data-testid="left-icon">←</span>}>
        Loading
      </Button>
    )
    expect(container.querySelector('[data-testid="left-icon"]')).not.toBeInTheDocument()
  })

  it('should render right icon when provided and not loading', () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">→</span>}>
        Button
      </Button>
    )
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('should hide right icon when loading', () => {
    const { container } = render(
      <Button isLoading rightIcon={<span data-testid="right-icon">→</span>}>
        Loading
      </Button>
    )
    expect(container.querySelector('[data-testid="right-icon"]')).not.toBeInTheDocument()
  })

  it('should handle disabled prop', () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:pointer-events-none')
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('should handle both isLoading and disabled props', () => {
    const { container } = render(
      <Button isLoading disabled>
        Disabled Loading
      </Button>
    )
    const button = container.querySelector('button') as HTMLElement
    expect(button).toBeDisabled()
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not trigger click when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    )

    const button = screen.getByRole('button', { name: /disabled/i })
    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should forward ref to button element', () => {
    const ref = jest.fn()
    const { container } = render(<Button ref={ref}>Ref Button</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(ref).toHaveBeenCalledWith(button)
  })

  it('should handle type attribute', () => {
    const { container } = render(<Button type="submit">Submit</Button>)
    const button = container.querySelector('button') as HTMLButtonElement
    expect(button.type).toBe('submit')
  })

  it('should render with both left and right icons', () => {
    render(
      <Button
        leftIcon={<span data-testid="left">←</span>}
        rightIcon={<span data-testid="right">→</span>}
      >
        Both Icons
      </Button>
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
    expect(screen.getByText('Both Icons')).toBeInTheDocument()
  })

  it('should have focus-visible ring styling', () => {
    const { container } = render(<Button>Focus Styles</Button>)
    const button = container.querySelector('button') as HTMLElement
    expect(button.className).toContain('focus-visible:outline-none')
    expect(button.className).toContain('focus-visible:ring-1')
  })

  it('should handle aria attributes', () => {
    const { container } = render(
      <Button aria-label="Custom label">Button</Button>
    )
    const button = container.querySelector('button') as HTMLElement
    expect(button.getAttribute('aria-label')).toBe('Custom label')
  })
})
