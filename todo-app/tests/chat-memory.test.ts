import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ChatMessage,
  ChatRequestSchema,
  generateRequestId,
  generateRunId,
  validateRoleAlternation,
  formatMessagesForClaude
} from '@/lib/chat-types'

describe('Chat Memory Implementation', () => {
  describe('Type Validation', () => {
    it('should validate a valid chat request', () => {
      const request = {
        message: 'Create a todo',
        history: [],
        requestId: generateRequestId(),
        maxIterations: 3
      }

      const result = ChatRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should provide default values for optional fields', () => {
      const request = {
        message: 'List todos',
        history: [],
        requestId: 'req_123'
      }

      const result = ChatRequestSchema.parse(request)
      expect(result.maxIterations).toBe(3)
      expect(result.history).toEqual([])
    })

    it('should reject invalid maxIterations', () => {
      const request = {
        message: 'Test',
        history: [],
        requestId: 'req_123',
        maxIterations: 10 // Over max of 5
      }

      const result = ChatRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })

    it('should handle complex message content', () => {
      const history: ChatMessage[] = [
        {
          role: 'user',
          content: 'Create a todo'
        },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'I\'ll create that for you.' },
            { type: 'tool_use', id: 'tool_1', name: 'create_todo', input: { title: 'Test' } }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool_1', content: '{"id": 1}' }
          ]
        }
      ]

      const request = {
        message: 'Show it',
        history,
        requestId: 'req_123'
      }

      const result = ChatRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
  })

  describe('Role Alternation Validation', () => {
    it('should validate proper user/assistant alternation', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'Create a todo' },
        { role: 'assistant', content: 'Created!' }
      ]

      expect(validateRoleAlternation(messages)).toBe(true)
    })

    it('should reject improper role alternation', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Hi!' }, // Two users in a row
        { role: 'assistant', content: 'Created!' }
      ]

      expect(validateRoleAlternation(messages)).toBe(false)
    })

    it('should allow tool_result exceptions in alternation', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Create todo' },
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'create_todo', input: {} }
          ]
        },
        {
          role: 'user', // Tool results come from user but don't break alternation
          content: [
            { type: 'tool_result', tool_use_id: 'tool_1', content: '{}' }
          ]
        },
        { role: 'assistant', content: 'Done!' }
      ]

      expect(validateRoleAlternation(messages)).toBe(true)
    })

    it('should handle empty message history', () => {
      expect(validateRoleAlternation([])).toBe(true)
    })
  })

  describe('ID Generation', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should generate run IDs from request IDs', () => {
      const requestId = 'req_123_abc'
      const runId = generateRunId(requestId)

      expect(runId).toBe('run_req_123_abc')
    })
  })

  describe('Message Formatting for Claude', () => {
    it('should preserve string content', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      const formatted = formatMessagesForClaude(messages)

      expect(formatted).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ])
    })

    it('should preserve complex content arrays', () => {
      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Creating todo...' },
            { type: 'tool_use', id: 't1', name: 'create_todo', input: { title: 'Test' } }
          ]
        }
      ]

      const formatted = formatMessagesForClaude(messages)

      expect(formatted[0].content).toEqual(messages[0].content)
    })

    it('should handle mixed content types', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Simple string' },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Complex' }]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: '{"success": true}' }
          ]
        }
      ]

      const formatted = formatMessagesForClaude(messages)
      expect(formatted).toHaveLength(3)
      expect(formatted[0].content).toBe('Simple string')
      expect(Array.isArray(formatted[1].content)).toBe(true)
    })
  })

  describe('Conversation Memory Flow', () => {
    it('should maintain context across multiple messages', () => {
      // Simulate a conversation flow
      const conversation: ChatMessage[] = []

      // First exchange
      conversation.push({ role: 'user', content: 'Create a grocery todo' })
      conversation.push({ role: 'assistant', content: 'I created a "Grocery Shopping" todo for you.' })

      // Second exchange - should remember the context
      conversation.push({ role: 'user', content: 'Mark it as high priority' })

      // Validate the conversation maintains proper structure
      expect(validateRoleAlternation(conversation)).toBe(true)
      expect(conversation).toHaveLength(3)
      expect(conversation[2].content).toContain('Mark it')
    })

    it('should handle tool executions in conversation history', () => {
      const conversation: ChatMessage[] = [
        { role: 'user', content: 'Create todo "Buy milk"' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Creating todo...' },
            { type: 'tool_use', id: 'tool_1', name: 'create_todo', input: { title: 'Buy milk' } }
          ],
          toolCalls: [{ name: 'create_todo', input: { title: 'Buy milk' }, result: { id: 1 } }]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool_1', content: '{"id": 1, "title": "Buy milk"}' }
          ]
        },
        { role: 'assistant', content: 'Created todo "Buy milk" with ID 1.' },
        { role: 'user', content: 'Now mark it complete' }
      ]

      expect(validateRoleAlternation(conversation)).toBe(true)
      expect(conversation[1].toolCalls).toBeDefined()
      expect(conversation[1].toolCalls![0].name).toBe('create_todo')
    })
  })
})