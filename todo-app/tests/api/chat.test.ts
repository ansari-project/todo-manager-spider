import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(() => Promise.resolve({
        content: [
          {
            type: 'text',
            text: 'I can help you with that todo.'
          }
        ]
      }))
    }
  }))
}))

// Mock MCP client
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => ({
    connect: vi.fn(),
    request: vi.fn(() => Promise.resolve({
      tools: [
        {
          name: 'list_todos',
          description: 'List todos',
          inputSchema: {}
        }
      ]
    }))
  }))
}))

// Mock child_process for MCP server spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn()
  }))
}))

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require a message in the request', async () => {
    const { POST } = await import('@/app/api/chat/route')

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Message is required')
  })

  it('should validate message processing flow', async () => {
    // The mocks return successful responses
    const { POST } = await import('@/app/api/chat/route')

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Show me my todos'
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.response).toBeDefined()
  })

  it('should validate tool execution flow', async () => {
    // Test that the route processes tool requests
    const { POST } = await import('@/app/api/chat/route')

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Add a todo to buy milk'
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.response).toBeDefined()
  })

  it('should handle the chat flow successfully', async () => {
    // Test successful chat processing
    const { POST } = await import('@/app/api/chat/route')

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.response).toBe('I can help you with that todo.')
  })
})