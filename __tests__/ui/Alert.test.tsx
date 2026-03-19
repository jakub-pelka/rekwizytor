import { render, screen } from '@testing-library/react'
import { Alert, AlertDescription } from '@/components/ui/Alert'

describe('Alert Component', () => {
  it('should render children correctly', () => {
    render(<Alert>Alert Content</Alert>)
    expect(screen.getByText('Alert Content')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<Alert>Alert</Alert>)
    const alert = container.firstChild as HTMLElement
    expect(alert.className).toContain('rounded-lg')
    expect(alert.className).toContain('border')
    expect(alert.className).toContain('border-gray-700')
    expect(alert.className).toContain('bg-gray-800/50')
    expect(alert.className).toContain('p-4')
  })

  it('should merge custom className', () => {
    const { container } = render(<Alert className="custom-alert">Custom Alert</Alert>)
    const alert = container.firstChild as HTMLElement
    expect(alert.className).toContain('custom-alert')
    expect(alert.className).toContain('rounded-lg')
  })

  it('should properly override default classes with custom className', () => {
    const { container } = render(<Alert className="rounded-none">Custom Border</Alert>)
    const alert = container.firstChild as HTMLElement
    expect(alert.className).toContain('rounded-none')
    expect(alert.className).not.toContain('rounded-lg')
  })

  it('should render as a div element', () => {
    const { container } = render(<Alert>Alert</Alert>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('should handle complex children with AlertDescription', () => {
    render(
      <Alert>
        <AlertDescription>This is an important alert message</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('This is an important alert message')).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <Alert>
        <div>Alert Title</div>
        <div>Alert Message</div>
      </Alert>
    )
    expect(screen.getByText('Alert Title')).toBeInTheDocument()
    expect(screen.getByText('Alert Message')).toBeInTheDocument()
  })
})

describe('AlertDescription Component', () => {
  it('should render children correctly', () => {
    render(<AlertDescription>Description Text</AlertDescription>)
    expect(screen.getByText('Description Text')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>)
    const description = container.firstChild as HTMLElement
    expect(description.className).toContain('text-sm')
    expect(description.className).toContain('text-gray-300')
  })

  it('should merge custom className', () => {
    const { container } = render(
      <AlertDescription className="custom-desc">Description</AlertDescription>
    )
    const description = container.firstChild as HTMLElement
    expect(description.className).toContain('custom-desc')
    expect(description.className).toContain('text-sm')
  })

  it('should properly override default classes with custom className', () => {
    const { container } = render(<AlertDescription className="text-white">Custom Color</AlertDescription>)
    const description = container.firstChild as HTMLElement
    expect(description.className).toContain('text-white')
    expect(description.className).not.toContain('text-gray-300')
  })

  it('should render as a div element', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('should handle React node children', () => {
    render(
      <AlertDescription>
        <strong>Error:</strong> Something went wrong
      </AlertDescription>
    )
    expect(screen.getByText('Error:')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should work as nested component inside Alert', () => {
    render(
      <Alert>
        <AlertDescription>Nested alert description</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Nested alert description')).toBeInTheDocument()
  })
})
