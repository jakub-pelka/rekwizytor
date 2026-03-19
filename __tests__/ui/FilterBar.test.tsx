import { render, screen } from '@testing-library/react'
import { FilterBar } from '@/components/ui/FilterBar'

describe('FilterBar Component', () => {
  it('should render children correctly', () => {
    render(<FilterBar>Filter Content</FilterBar>)
    expect(screen.getByText('Filter Content')).toBeInTheDocument()
  })

  it('should render as a div element', () => {
    const { container } = render(<FilterBar>FilterBar</FilterBar>)
    expect(container.firstChild).toHaveProperty('tagName', 'DIV')
  })

  it('should apply default styles', () => {
    const { container } = render(<FilterBar>Default</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('sticky')
    expect(filterBar.className).toContain('top-0')
    expect(filterBar.className).toContain('z-30')
    expect(filterBar.className).toContain('mb-8')
    expect(filterBar.className).toContain('rounded-xl')
    expect(filterBar.className).toContain('border')
    expect(filterBar.className).toContain('backdrop-blur-md')
    expect(filterBar.className).toContain('shadow-sm')
    expect(filterBar.className).toContain('transition-all')
    expect(filterBar.className).toContain('duration-200')
    expect(filterBar.className).toContain('bg-neutral-950/80')
    expect(filterBar.className).toContain('border-white/5')
    expect(filterBar.className).toContain('p-3')
  })

  it('should apply responsive padding', () => {
    const { container } = render(<FilterBar>Responsive</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('p-3')
    expect(filterBar.className).toContain('md:p-4')
  })

  it('should merge custom className', () => {
    const { container } = render(<FilterBar className="custom-bar">Custom</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('custom-bar')
    expect(filterBar.className).toContain('sticky')
  })

  it('should merge custom className with defaults', () => {
    const { container } = render(<FilterBar className="custom-class">Custom</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('custom-class')
    expect(filterBar.className).toContain('rounded-xl')
  })

  it('should have flex layout for children', () => {
    const { container } = render(
      <FilterBar>
        <div>Filter 1</div>
        <div>Filter 2</div>
      </FilterBar>
    )
    const innerDiv = container.querySelector('.flex') as HTMLElement
    expect(innerDiv).toBeInTheDocument()
    expect(innerDiv.className).toContain('flex')
    expect(innerDiv.className).toContain('flex-row')
    expect(innerDiv.className).toContain('flex-wrap')
    expect(innerDiv.className).toContain('gap-4')
    expect(innerDiv.className).toContain('justify-between')
    expect(innerDiv.className).toContain('items-center')
  })

  it('should render multiple children correctly', () => {
    render(
      <FilterBar>
        <div>Filter 1</div>
        <div>Filter 2</div>
        <div>Filter 3</div>
      </FilterBar>
    )
    expect(screen.getByText('Filter 1')).toBeInTheDocument()
    expect(screen.getByText('Filter 2')).toBeInTheDocument()
    expect(screen.getByText('Filter 3')).toBeInTheDocument()
  })

  it('should render complex filter elements', () => {
    render(
      <FilterBar>
        <select>
          <option>Option 1</option>
        </select>
        <input type="text" placeholder="Search..." />
        <button>Apply</button>
      </FilterBar>
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should have sticky positioning for scrolling', () => {
    const { container } = render(<FilterBar>Sticky Bar</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('sticky')
    expect(filterBar.className).toContain('top-0')
  })

  it('should have proper z-index for layering', () => {
    const { container } = render(<FilterBar>Z-Index</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('z-30')
  })

  it('should apply backdrop blur for glassmorphism effect', () => {
    const { container } = render(<FilterBar>Glass Effect</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('backdrop-blur-md')
  })

  it('should apply transition effects', () => {
    const { container } = render(<FilterBar>Transition</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('transition-all')
    expect(filterBar.className).toContain('duration-200')
  })

  it('should have shadow styling', () => {
    const { container } = render(<FilterBar>Shadow</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('shadow-sm')
  })

  it('should have proper border color', () => {
    const { container } = render(<FilterBar>Border</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('border-white/5')
  })

  it('should have dark background with transparency', () => {
    const { container } = render(<FilterBar>Dark BG</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    expect(filterBar.className).toContain('bg-neutral-950/80')
  })

  it('should handle empty children', () => {
    const { container } = render(<FilterBar></FilterBar>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should pass through HTML attributes to children wrapper', () => {
    const { container } = render(
      <FilterBar>
        <div data-testid="filter-item">Content</div>
      </FilterBar>
    )
    expect(screen.getByTestId('filter-item')).toBeInTheDocument()
  })

  it('should work with React node children', () => {
    const CustomComponent = () => <span>Custom</span>
    render(
      <FilterBar>
        <CustomComponent />
      </FilterBar>
    )
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('should maintain layout with many children', () => {
    render(
      <FilterBar>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>Filter {i}</div>
        ))}
      </FilterBar>
    )
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Filter ${i}`)).toBeInTheDocument()
    }
  })

  it('should be responsive to viewport size', () => {
    const { container } = render(<FilterBar>Responsive</FilterBar>)
    const filterBar = container.firstChild as HTMLElement
    // Check for md breakpoint classes
    expect(filterBar.className).toMatch(/md:/)
  })
})
