import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input Component', () => {
  it('should render as an input element', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  it('should apply default styles', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input') as HTMLElement
    expect(input.className).toContain('w-full')
    expect(input.className).toContain('px-3')
    expect(input.className).toContain('py-2')
    expect(input.className).toContain('bg-gray-800')
    expect(input.className).toContain('border')
    expect(input.className).toContain('border-gray-700')
    expect(input.className).toContain('rounded-md')
    expect(input.className).toContain('text-white')
  })

  it('should apply focus styles', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input') as HTMLElement
    expect(input.className).toContain('focus:outline-none')
    expect(input.className).toContain('focus:ring-2')
    expect(input.className).toContain('focus:ring-blue-500')
    expect(input.className).toContain('focus:border-transparent')
  })

  it('should apply placeholder styles', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input') as HTMLElement
    expect(input.className).toContain('placeholder:text-gray-500')
  })

  it('should merge custom className', () => {
    const { container } = render(<Input className="custom-input" />)
    const input = container.querySelector('input') as HTMLElement
    expect(input.className).toContain('custom-input')
    expect(input.className).toContain('w-full')
  })

  it('should properly override default classes with custom className', () => {
    const { container } = render(<Input className="bg-blue-800" />)
    const input = container.querySelector('input') as HTMLElement
    expect(input.className).toContain('bg-blue-800')
    expect(input.className).not.toContain('bg-gray-800')
  })

  it('should handle placeholder attribute', () => {
    render(<Input placeholder="Enter text..." />)
    const input = screen.getByPlaceholderText('Enter text...') as HTMLInputElement
    expect(input).toBeInTheDocument()
  })

  it('should handle value attribute', () => {
    render(<Input value="test value" readOnly />)
    const input = screen.getByDisplayValue('test value') as HTMLInputElement
    expect(input).toBeInTheDocument()
  })

  it('should handle type attribute', () => {
    const { container } = render(<Input type="email" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('email')
  })

  it('should handle password type', () => {
    const { container } = render(<Input type="password" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('should handle number type', () => {
    const { container } = render(<Input type="number" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('number')
  })

  it('should handle text input events', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'hello')
    expect(handleChange).toHaveBeenCalled()
    expect(input.value).toBe('hello')
  })

  it('should handle disabled attribute', () => {
    const { container } = render(<Input disabled />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('should handle readOnly attribute', () => {
    const { container } = render(<Input readOnly value="readonly" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toHaveAttribute('readonly')
  })

  it('should handle required attribute', () => {
    const { container } = render(<Input required />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toHaveAttribute('required')
  })

  it('should forward input props', () => {
    const { container } = render(
      <Input
        maxLength={10}
        minLength={5}
        data-testid="custom-input"
      />
    )
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toHaveAttribute('maxlength', '10')
    expect(input).toHaveAttribute('minlength', '5')
    expect(input).toHaveAttribute('data-testid', 'custom-input')
  })

  it('should handle focus event', async () => {
    const user = userEvent.setup()
    const handleFocus = jest.fn()
    render(<Input onFocus={handleFocus} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    expect(handleFocus).toHaveBeenCalled()
  })

  it('should handle blur event', async () => {
    const user = userEvent.setup()
    const handleBlur = jest.fn()
    render(<Input onBlur={handleBlur} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })

  it('should support aria attributes', () => {
    const { container } = render(
      <Input aria-label="Username input" aria-required="true" />
    )
    const input = container.querySelector('input') as HTMLElement
    expect(input.getAttribute('aria-label')).toBe('Username input')
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  it('should handle autoComplete attribute', () => {
    const { container } = render(<Input autoComplete="email" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toHaveAttribute('autocomplete', 'email')
  })

  it('should be compatible with form submission', async () => {
    const user = userEvent.setup()
    const handleSubmit = jest.fn((e) => e.preventDefault())
    const { container } = render(
      <form onSubmit={handleSubmit}>
        <Input name="email" />
        <button type="submit">Submit</button>
      </form>
    )

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    expect(handleSubmit).toHaveBeenCalled()
  })
})
