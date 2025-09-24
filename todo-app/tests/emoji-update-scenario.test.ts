import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Anthropic SDK before importing routes
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: class MockAnthropic {
      static mockCreate = mockCreate // Expose for test access
      constructor() {
        this.messages = {
          create: mockCreate
        }
      }
    }
  }
})

// Now import routes - they'll use the mocked SDK
import { POST as streamPOST } from '@/app/api/chat/stream/route'
import { POST as continuePOST } from '@/app/api/chat/continue/route'

// Get mockCreate from the mock
import Anthropic from '@anthropic-ai/sdk'
const mockCreate = (Anthropic as any).mockCreate

describe('Add Emojis to Todos Scenario', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockCreate.mockClear()
  })

  it('should handle "add emojis to todos" with two-step tool execution', async () => {
    // Step 1: Initial request should trigger todo_list
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: "I'll add emojis to your todos. Let me first see what todos you have."
        },
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'todo_list',
          input: {}
        }
      ]
    })

    const request = new NextRequest('http://localhost/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        message: 'add emojis to my todos',
        history: [],
        requestId: 'test-123'
      })
    })

    const response = await streamPOST(request)
    expect(response).toBeDefined()
    expect(response.body).toBeDefined()

    // Read streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader')
    }

    const decoder = new TextDecoder()
    let toolRequestEvent = null
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullResponse += chunk
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data && data !== '[DONE]') {
            try {
              const event = JSON.parse(data)
              if (event.type === 'tool_request') {
                toolRequestEvent = event
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    }

    expect(toolRequestEvent).toBeTruthy()
    expect(toolRequestEvent.tools[0].name).toBe('todo_list')

    // Step 2: After getting todos, Claude should request multiple todo_update calls
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: "I can see your todos. Now I'll add appropriate emojis to each one."
        },
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'todo_update',
          input: {
            id: 'todo-1',
            title: '🛒 Buy groceries'
          }
        },
        {
          type: 'tool_use',
          id: 'tool-3',
          name: 'todo_update',
          input: {
            id: 'todo-2',
            title: '💼 Do work'
          }
        },
        {
          type: 'tool_use',
          id: 'tool-4',
          name: 'todo_update',
          input: {
            id: 'todo-3',
            title: '📧 Check email'
          }
        }
      ]
    })

    // Simulate the continue request after todo_list
    const continueRequest = new NextRequest('http://localhost/api/chat/continue', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'add emojis to my todos' },
          {
            role: 'assistant',
            content: [
              { type: 'text', text: "I'll add emojis to your todos. Let me first see what todos you have." },
              { type: 'tool_use', id: 'tool-1', name: 'todo_list', input: {} }
            ]
          }
        ],
        toolResults: [{
          tool_use_id: 'tool-1',
          content: JSON.stringify({
            todos: [
              { id: 'todo-1', title: 'Buy groceries', status: 'pending' },
              { id: 'todo-2', title: 'Do work', status: 'pending' },
              { id: 'todo-3', title: 'Check email', status: 'pending' }
            ]
          })
        }]
      })
    })

    const continueResponse = await continuePOST(continueRequest)
    const continueResult = await continueResponse.json()

    // Should indicate more tools are needed
    expect(continueResult.needsMoreTools).toBe(true)
    expect(continueResult.toolRequests).toHaveLength(3)
    expect(continueResult.toolRequests[0].name).toBe('todo_update')
    expect(continueResult.toolRequests[1].name).toBe('todo_update')
    expect(continueResult.toolRequests[2].name).toBe('todo_update')

    // Each update should have the correct todo ID from the list
    expect(continueResult.toolRequests[0].input.id).toBe('todo-1')
    expect(continueResult.toolRequests[1].input.id).toBe('todo-2')
    expect(continueResult.toolRequests[2].input.id).toBe('todo-3')
  })

  it('should not use made-up IDs when updating todos', async () => {
    // First call returns todo_list request
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: 'tool_use', id: 'tool-1', name: 'todo_list', input: {} }
      ]
    })

    // Second call should use actual IDs from the todo_list response
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'todo_update',
          input: {
            id: 'actual-uuid-from-list', // Should use real ID, not made up
            title: '🎯 Updated todo'
          }
        }
      ]
    })

    const continueRequest = new NextRequest('http://localhost/api/chat/continue', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'update my todo' },
          { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'todo_list', input: {} }] }
        ],
        toolResults: [{
          tool_use_id: 'tool-1',
          content: JSON.stringify({
            todos: [
              { id: 'actual-uuid-from-list', title: 'Original todo', status: 'pending' }
            ]
          })
        }]
      })
    })

    const response = await continuePOST(continueRequest)
    const result = await response.json()

    if (result.needsMoreTools) {
      expect(result.toolRequests[0].input.id).toBe('actual-uuid-from-list')
      // Should NOT be a random UUID or made-up ID
      expect(result.toolRequests[0].input.id).not.toMatch(/^[a-f0-9]{8}-/)
    }
  })
})