import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoForm } from '@/app/components/TodoForm'

describe('TodoForm', () => {
  it('should render form inputs', () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} />)

    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add a description (optional)')).toBeInTheDocument()
    expect(screen.getByText('Add Todo')).toBeInTheDocument()
  })

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} />)

    const titleInput = screen.getByPlaceholderText('What needs to be done?')
    const descriptionInput = screen.getByPlaceholderText('Add a description (optional)')
    const submitButton = screen.getByText('Add Todo')

    fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Test Todo',
        description: 'Test Description',
        priority: 'medium',
        dueDate: undefined,
        status: 'pending',
      })
    })
  })

  it('should not submit with empty title', () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} />)

    const submitButton = screen.getByText('Add Todo')
    fireEvent.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should reset form after submission', async () => {
    const onSubmit = vi.fn()
    render(<TodoForm onSubmit={onSubmit} />)

    const titleInput = screen.getByPlaceholderText('What needs to be done?') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
    fireEvent.click(screen.getByText('Add Todo'))

    await waitFor(() => {
      expect(titleInput.value).toBe('')
    })
  })
})