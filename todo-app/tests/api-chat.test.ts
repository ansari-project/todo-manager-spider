import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'
import { generateRequestId } from '@/lib/chat-types'

// Mock the MCP client and Anthropic
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn()
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn()
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}))

describe('Chat API Memory Tests', () => {
  let mockAnthropicCreate: any
  let mockMCPClient: any

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock Anthropic
    mockAnthropicCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'I can help you with that!' }]
    })

    const Anthropic = vi.fn(() => ({
      messages: {
        create: mockAnthropicCreate
      }
    }))
    vi.mocked(Anthropic).mockImplementation(Anthropic as any)

    // Setup mock MCP Client
    mockMCPClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockImplementation((params: any) => {
        if (params.method === 'tools/list') {
          return Promise.resolve({
            tools: [
              {
                name: 'list_todos',
                description: 'List todos',
                inputSchema: { type: 'object' }
              },
              {
                name: 'create_todo',
                description: 'Create a todo',
                inputSchema: { type: 'object' }
              }
            ]
          })
        }
        if (params.method === 'tools/call') {
          return Promise.resolve({ id: 1, title: 'Test Todo' })
        }
        return Promise.resolve({})
      })
    }

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    vi.mocked(Client).mockImplementation(() => mockMCPClient)
  })

  describe('Request Validation', () => {
    it('should accept valid request with history', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Create a todo',
          history: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi!' }
          ],
          requestId: generateRequestId(),
          maxIterations: 3
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.run_id).toBeDefined()
      expect(data.iterations).toBeDefined()
    })

    it('should reject invalid role alternation', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          history: [
            { role: 'user', content: 'Hello' },
            { role: 'user', content: 'Hi!' } // Invalid: two users in a row
          ],
          requestId: 'req_test'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('roles must alternate')
    })

    it('should provide defaults for optional parameters', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'List todos',
          history: [],
          requestId: 'req_123'
          // maxIterations not provided, should default to 3
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Conversation Context', () => {
    it('should include full history in Claude API call', async () => {
      const history = [
        { role: 'user', content: 'Create todo "Buy milk"' },
        { role: 'assistant', content: 'Created todo "Buy milk"' },
        { role: 'user', content: 'Create todo "Buy eggs"' },
        { role: 'assistant', content: 'Created todo "Buy eggs"' }
      ]

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'List all todos',
          history,
          requestId: 'req_test'
        })
      })

      // Mock to capture the messages passed to Claude
      let capturedMessages: any[] = []
      mockAnthropicCreate.mockImplementation((params: any) => {
        capturedMessages = params.messages
        return Promise.resolve({
          content: [{ type: 'text', text: 'Here are your todos...' }]
        })
      })

      await POST(request)

      // Verify history was included
      expect(capturedMessages.length).toBeGreaterThanOrEqual(history.length)
      expect(capturedMessages[0].content).toBe('Create todo "Buy milk"')
    })

    it('should handle pronoun references with context', async () => {
      const history = [
        { role: 'user', content: 'Create todo "Buy groceries"' },
        { role: 'assistant', content: 'I created the todo "Buy groceries" for you.' }
      ]

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Mark it as complete', // "it" refers to previous todo
          history,
          requestId: 'req_pronoun'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      // The actual pronoun resolution would be handled by Claude with the context
    })
  })

  describe('Tool Execution Memory', () => {
    it('should track executed tools', async () => {
      // Mock Claude to request tool use
      mockAnthropicCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'create_todo', input: { title: 'Test' } }
          ]
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Todo created!' }]
        })

      // Tool execution already mocked in beforeEach

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Create a test todo',
          history: [],
          requestId: 'req_tools'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.toolsExecuted).toContain('create_todo')
      expect(data.iterations).toBeGreaterThan(0)
    })

    it('should prevent duplicate tool executions', async () => {
      // Mock Claude to request the same tool twice
      mockAnthropicCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'list_todos', input: {} },
            { type: 'tool_use', id: 'tool_2', name: 'list_todos', input: {} } // Duplicate
          ]
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Listed todos' }]
        })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'List todos twice',
          history: [],
          requestId: 'req_dedup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should only execute once due to deduplication
      expect(data.toolsExecuted).toEqual(['list_todos'])
    })
  })

  describe('Iteration and Timeout Control', () => {
    it('should respect maxIterations limit', async () => {
      // Mock Claude to keep requesting tools
      mockAnthropicCreate.mockResolvedValue({
        content: [
          { type: 'tool_use', id: 'tool_x', name: 'list_todos', input: { page: 1 } }
        ]
      })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Keep listing',
          history: [],
          requestId: 'req_iter',
          maxIterations: 2 // Limit to 2 iterations
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.iterations).toBeLessThanOrEqual(2)
    })

    it('should generate and return run_id', async () => {
      const requestId = 'req_12345'
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test',
          history: [],
          requestId
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.run_id).toBeDefined()
      expect(data.run_id).toContain('run_')
      expect(data.run_id).toContain(requestId)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing message gracefully', async () => {
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          history: [],
          requestId: 'req_test'
          // message is missing
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should handle tool execution errors', async () => {
      mockAnthropicCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'create_todo', input: {} }
          ]
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Sorry, there was an error' }]
        })

      // Mock MCP to throw error
      mockMCPClient.request.mockImplementation((params: any) => {
        if (params.method === 'tools/call') {
          throw new Error('Tool execution failed')
        }
        if (params.method === 'tools/list') {
          return Promise.resolve({ tools: [] })
        }
        return Promise.resolve({})
      })

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Create todo',
          history: [],
          requestId: 'req_error'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Should still return 200 but handle error gracefully
    })
  })
})