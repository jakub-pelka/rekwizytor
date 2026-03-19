import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

describe('Card Component', () => {
  it('should render children correctly', () => {
    render(<Card>Card Content</Card>)
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<Card>Default Card</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-gray-900')
    expect(card.className).toContain('border')
    expect(card.className).toContain('border-gray-800')
    expect(card.className).toContain('rounded-lg')
    expect(card.className).toContain('shadow-lg')
  })

  it('should merge custom className', () => {
    const { container } = render(<Card className="custom-class">Custom Card</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('custom-class')
    expect(card.className).toContain('bg-gray-900')
  })

  it('should properly override default classes with custom className', () => {
    const { container } = render(<Card className="bg-blue-900">Custom BG</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-blue-900')
    expect(card.className).not.toContain('bg-gray-900')
  })

  it('should render as a div element', () => {
    const { container } = render(<Card>Div Card</Card>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('should handle complex children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('CardHeader Component', () => {
  it('should render children correctly', () => {
    render(<CardHeader>Header Content</CardHeader>)
    expect(screen.getByText('Header Content')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<CardHeader>Header</CardHeader>)
    const header = container.firstChild as HTMLElement
    expect(header.className).toContain('p-6')
    expect(header.className).toContain('border-b')
    expect(header.className).toContain('border-gray-800')
  })

  it('should merge custom className', () => {
    const { container } = render(<CardHeader className="custom-header">Header</CardHeader>)
    const header = container.firstChild as HTMLElement
    expect(header.className).toContain('custom-header')
    expect(header.className).toContain('p-6')
  })

  it('should render as a div element', () => {
    const { container } = render(<CardHeader>Header</CardHeader>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })
})

describe('CardTitle Component', () => {
  it('should render children correctly', () => {
    render(<CardTitle>Title Text</CardTitle>)
    expect(screen.getByText('Title Text')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<CardTitle>Title</CardTitle>)
    const title = container.firstChild as HTMLElement
    expect(title.className).toContain('text-xl')
    expect(title.className).toContain('font-semibold')
    expect(title.className).toContain('text-white')
  })

  it('should merge custom className', () => {
    const { container } = render(<CardTitle className="custom-title">Title</CardTitle>)
    const title = container.firstChild as HTMLElement
    expect(title.className).toContain('custom-title')
    expect(title.className).toContain('text-xl')
  })

  it('should render as an h3 element', () => {
    const { container } = render(<CardTitle>Title</CardTitle>)
    expect(container.firstChild).toHaveProperty('tagName', 'H3')
  })

  it('should handle nested elements in children', () => {
    render(
      <CardTitle>
        <span data-testid="icon">★</span> Starred Title
      </CardTitle>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Starred Title')).toBeInTheDocument()
  })
})

describe('CardDescription Component', () => {
  it('should render children correctly', () => {
    render(<CardDescription>Description Text</CardDescription>)
    expect(screen.getByText('Description Text')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<CardDescription>Description</CardDescription>)
    const description = container.firstChild as HTMLElement
    expect(description.className).toContain('text-sm')
    expect(description.className).toContain('text-gray-400')
    expect(description.className).toContain('mt-1')
  })

  it('should merge custom className', () => {
    const { container } = render(<CardDescription className="custom-desc">Description</CardDescription>)
    const description = container.firstChild as HTMLElement
    expect(description.className).toContain('custom-desc')
    expect(description.className).toContain('text-sm')
  })

  it('should render as a p element', () => {
    const { container } = render(<CardDescription>Description</CardDescription>)
    expect(container.firstChild).toHaveProperty('tagName', 'P')
  })
})

describe('CardContent Component', () => {
  it('should render children correctly', () => {
    render(<CardContent>Content Text</CardContent>)
    expect(screen.getByText('Content Text')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<CardContent>Content</CardContent>)
    const content = container.firstChild as HTMLElement
    expect(content.className).toContain('p-6')
  })

  it('should merge custom className', () => {
    const { container } = render(<CardContent className="custom-content">Content</CardContent>)
    const content = container.firstChild as HTMLElement
    expect(content.className).toContain('custom-content')
    expect(content.className).toContain('p-6')
  })

  it('should render as a div element', () => {
    const { container } = render(<CardContent>Content</CardContent>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('should handle multiple child nodes', () => {
    render(
      <CardContent>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </CardContent>
    )
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
  })
})
