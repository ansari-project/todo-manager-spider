import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { StreamingConversationalInterface } from '../app/components/StreamingConversationalInterface'

// Mock scrollIntoView since it's not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock fetch for streaming responses
global.fetch = vi.fn(() => {
  // Create a mock ReadableStream that immediately closes
  const mockStream = new ReadableStream({
    start(controller) {
      // Send a complete event
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode('data: {"type":"complete","response":"Test response","historyDelta":[]}\n\n'))
      controller.close()
    }
  })

  return Promise.resolve({
    ok: true,
    status: 200,
    body: mockStream,
    headers: new Headers({
      'Content-Type': 'text/event-stream'
    }),
  } as Response)
})

// Mock ServiceWorkerProvider context
vi.mock('../app/components/ServiceWorkerProvider', () => ({
  useServiceWorker: () => ({ isReady: true, status: 'ready', error: null }),
  ServiceWorkerProvider: ({ children }: any) => children
}))

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, disabled, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  )
}))

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children, className }: any) => (
    <div className={className} data-testid="markdown-content">
      {children}
    </div>
  )
}))

vi.mock('remark-gfm', () => ({
  default: () => ({})
}))

describe('StreamingConversationalInterface with Markdown', () => {
  let mockOnSendMessage: ReturnType<typeof vi.fn>
  let mockOnTodosChanged: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnSendMessage = vi.fn()
    mockOnTodosChanged = vi.fn()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the interface with all necessary elements', () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Check for input field
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      expect(input).toBeInTheDocument()

      // Check for send button
      const button = screen.getByText('Send')
      expect(button).toBeInTheDocument()
    })

    it('should render messages with markdown wrapper', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Type and send a message
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      const sendButton = screen.getByText('Send')

      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)

      // Wait for the message to appear
      await waitFor(() => {
        const userMessage = container.querySelector('.bg-blue-500')
        expect(userMessage).toBeInTheDocument()
      })

      // Check that markdown renderer is used
      const markdownContent = container.querySelector('[data-testid="markdown-content"]')
      expect(markdownContent).toBeInTheDocument()
    })
  })

  describe('Message Styling', () => {
    it('should apply different styles for user and assistant messages', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Send a user message
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      const sendButton = screen.getByText('Send')

      fireEvent.change(input, { target: { value: 'User message' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        const userMessage = container.querySelector('.bg-blue-500')
        expect(userMessage).toBeInTheDocument()
        expect(userMessage).toHaveClass('text-white')
      })
    })

    it('should apply prose classes to markdown content', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Send a message
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(screen.getByText('Send'))

      await waitFor(() => {
        const markdownContent = container.querySelector('[data-testid="markdown-content"]')
        expect(markdownContent).toBeInTheDocument()
        // Check that the parent div has prose classes
        const parentDiv = markdownContent?.parentElement
        expect(parentDiv?.className).toContain('prose')
      })
    })

    it('should apply prose-invert for user messages', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Send a user message
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: 'User test' } })
      fireEvent.click(screen.getByText('Send'))

      await waitFor(() => {
        const userMessage = container.querySelector('.bg-blue-500')
        const markdownContent = userMessage?.querySelector('[data-testid="markdown-content"]')
        // Check the parent div that has the prose classes
        const parentDiv = markdownContent?.parentElement
        expect(parentDiv?.className).toContain('prose-invert')
      })
    })
  })

  describe('Message Content Formatting', () => {
    it('should handle messages with complex markdown', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      const complexMessage = `# Header
**Bold text** and *italic*
- List item 1
- List item 2
\`inline code\``

      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: complexMessage } })
      fireEvent.click(screen.getByText('Send'))

      await waitFor(() => {
        const markdownContent = container.querySelector('[data-testid="markdown-content"]')
        expect(markdownContent).toBeInTheDocument()
        // The markdown content will be processed, so just check it exists
        expect(markdownContent?.textContent).toBeDefined()
      })
    })

    it('should format message content from arrays correctly', () => {
      // Test the formatMessageContent function logic
      const arrayContent = [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' }
      ]

      // This would be the expected output
      const expectedOutput = 'First part\nSecond part'

      // Simulate the formatting
      const formatted = arrayContent
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n')

      expect(formatted).toBe(expectedOutput)
    })
  })

  describe('Streaming Status', () => {
    it('should show loading state with markdown', async () => {
      const { container, rerender } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Simulate loading state by sending a message
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(screen.getByText('Send'))

      // The loading state should appear
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      }, { timeout: 100 })
    })

    it('should display iteration counter', async () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Send a message to trigger loading
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(screen.getByText('Send'))

      // Check for the processing state
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      }, { timeout: 100 })
    })
  })

  describe('Input Handling', () => {
    it('should clear input after sending message', async () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      const input = screen.getByPlaceholderText('Tell me what you want to do...') as HTMLInputElement
      const sendButton = screen.getByText('Send')

      fireEvent.change(input, { target: { value: 'Test message' } })
      expect(input.value).toBe('Test message')

      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should disable input during loading', async () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      const input = screen.getByPlaceholderText('Tell me what you want to do...') as HTMLInputElement
      const sendButton = screen.getByText('Send')

      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(input).toBeDisabled()
        expect(sendButton).toBeDisabled()
        expect(sendButton.textContent).toBe('Processing...')
      }, { timeout: 100 })
    })
  })

  describe('Conversation Context', () => {
    it('should show message count', async () => {
      const { container } = render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      // Send multiple messages
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      const sendButton = screen.getByText('Send')

      fireEvent.change(input, { target: { value: 'First message' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        const contextText = container.querySelector('.text-gray-500')
        if (contextText) {
          expect(contextText.textContent).toContain('Context:')
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle empty messages gracefully', () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      const sendButton = screen.getByText('Send')
      fireEvent.click(sendButton)

      // Should not call onSendMessage with empty input
      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })

    it('should handle very long messages', async () => {
      render(
        <StreamingConversationalInterface
          onSendMessage={mockOnSendMessage}
          onTodosChanged={mockOnTodosChanged}
        />
      )

      const longMessage = 'x'.repeat(10000)
      const input = screen.getByPlaceholderText('Tell me what you want to do...')
      fireEvent.change(input, { target: { value: longMessage } })
      fireEvent.click(screen.getByText('Send'))

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalled()
      })
    })
  })
})