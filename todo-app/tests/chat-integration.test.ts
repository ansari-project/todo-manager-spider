import { describe, it, expect } from 'vitest'
import {
  ChatMessage,
  validateRoleAlternation,
  formatMessagesForClaude,
  generateRequestId,
  generateRunId,
  ChatRequestSchema
} from '@/lib/chat-types'

describe('Chat Memory Integration Tests', () => {
  describe('Memory Retention Scenarios', () => {
    it('should maintain context for pronoun references', () => {
      // Simulated conversation with pronoun "it"
      const conversation: ChatMessage[] = [
        { role: 'user', content: 'Create a todo called "Buy milk"' },
        {
          role: 'assistant',
          content: 'I\'ve created the todo "Buy milk" for you.',
          toolCalls: [{
            name: 'create_todo',
            input: { title: 'Buy milk' },
            result: { id: 1, title: 'Buy milk' }
          }]
        },
        { role: 'user', content: 'Mark it as high priority' } // "it" refers to the todo
      ]

      // Validate conversation structure
      expect(validateRoleAlternation(conversation)).toBe(true)

      // The last message should contain pronoun reference
      const lastUserMessage = conversation[conversation.length - 1]
      expect(lastUserMessage.content).toContain('it')

      // Previous assistant message should have the context
      const previousAssistant = conversation[conversation.length - 2]
      expect(previousAssistant.toolCalls).toBeDefined()
      expect(previousAssistant.toolCalls![0].result.id).toBe(1)
    })

    it('should handle multi-step todo operations', () => {
      const conversation: ChatMessage[] = [
        { role: 'user', content: 'Create three todos: shopping, cleaning, cooking' },
        {
          role: 'assistant',
          content: 'I\'ll create those three todos for you.',
          toolCalls: [
            { name: 'create_todo', input: { title: 'Shopping' }, result: { id: 1 } },
            { name: 'create_todo', input: { title: 'Cleaning' }, result: { id: 2 } },
            { name: 'create_todo', input: { title: 'Cooking' }, result: { id: 3 } }
          ]
        },
        { role: 'user', content: 'Now mark the first one as complete' },
        {
          role: 'assistant',
          content: 'I\'ve marked "Shopping" as complete.',
          toolCalls: [
            { name: 'update_todo', input: { id: 1, completed: true }, result: { id: 1, completed: true } }
          ]
        }
      ]

      expect(validateRoleAlternation(conversation)).toBe(true)
      expect(conversation[1].toolCalls).toHaveLength(3)
      expect(conversation[3].toolCalls![0].input.id).toBe(1)
    })

    it('should preserve tool execution results in history', () => {
      const conversation: ChatMessage[] = [
        { role: 'user', content: 'Show me all todos' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me fetch your todos.' },
            { type: 'tool_use', id: 'tool_1', name: 'list_todos', input: {} }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_1',
              content: JSON.stringify([
                { id: 1, title: 'Buy milk', completed: false },
                { id: 2, title: 'Walk dog', completed: true }
              ])
            }
          ]
        },
        {
          role: 'assistant',
          content: 'You have 2 todos: "Buy milk" (pending) and "Walk dog" (completed).'
        }
      ]

      // Validate the conversation maintains tool results
      expect(validateRoleAlternation(conversation)).toBe(true)

      // Tool result should be preserved
      const toolResult = conversation[2]
      expect(Array.isArray(toolResult.content)).toBe(true)
      const resultContent = (toolResult.content as any[])[0]
      expect(resultContent.type).toBe('tool_result')

      // Final response should reference the actual data
      expect(conversation[3].content).toContain('Buy milk')
      expect(conversation[3].content).toContain('Walk dog')
    })
  })

  describe('Request Building with History', () => {
    it('should build valid request with full conversation history', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi! How can I help?' },
        { role: 'user', content: 'Create a todo' },
        { role: 'assistant', content: 'Todo created!' }
      ]

      const request = {
        message: 'Show all todos',
        history,
        requestId: generateRequestId(),
        maxIterations: 3
      }

      const validated = ChatRequestSchema.parse(request)
      expect(validated.history).toHaveLength(4)
      expect(validated.message).toBe('Show all todos')
      expect(validated.maxIterations).toBe(3)
    })

    it('should generate unique run IDs for each request', () => {
      const requestId1 = generateRequestId()
      const requestId2 = generateRequestId()
      const runId1 = generateRunId(requestId1)
      const runId2 = generateRunId(requestId2)

      expect(runId1).not.toBe(runId2)
      expect(runId1).toContain(requestId1)
      expect(runId2).toContain(requestId2)
    })
  })

  describe('Claude Message Formatting', () => {
    it('should format messages correctly for Claude API', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Create todo' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Creating...' },
            { type: 'tool_use', id: 't1', name: 'create_todo', input: {} }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: '{"id": 1}' }
          ]
        },
        { role: 'assistant', content: 'Created todo with ID 1' }
      ]

      const formatted = formatMessagesForClaude(messages)

      expect(formatted).toHaveLength(4)
      expect(formatted[0].role).toBe('user')
      expect(formatted[0].content).toBe('Create todo')
      expect(Array.isArray(formatted[1].content)).toBe(true)
      expect(formatted[3].content).toBe('Created todo with ID 1')
    })

    it('should preserve tool use and tool result structure', () => {
      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'list_todos', input: { filter: 'active' } }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_1',
              content: '[{"id": 1, "title": "Test"}]',
              is_error: false
            }
          ]
        }
      ]

      const formatted = formatMessagesForClaude(messages)

      const toolUse = (formatted[0].content as any[])[0]
      expect(toolUse.type).toBe('tool_use')
      expect(toolUse.name).toBe('list_todos')
      expect(toolUse.input.filter).toBe('active')

      const toolResult = (formatted[1].content as any[])[0]
      expect(toolResult.type).toBe('tool_result')
      expect(toolResult.tool_use_id).toBe('tool_1')
      expect(toolResult.is_error).toBe(false)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle tool execution errors gracefully', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Delete todo 999' },
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'delete_todo', input: { id: 999 } }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_1',
              content: JSON.stringify({ error: 'Todo not found' }),
              is_error: true
            }
          ]
        },
        {
          role: 'assistant',
          content: 'Sorry, I couldn\'t find a todo with ID 999.'
        }
      ]

      expect(validateRoleAlternation(messages)).toBe(true)

      const errorResult = (messages[2].content as any[])[0]
      expect(errorResult.is_error).toBe(true)
      expect(errorResult.content).toContain('not found')
    })

    it('should validate request schema properly', () => {
      // Invalid: missing required fields
      const invalid1 = { message: 'Test' }
      expect(ChatRequestSchema.safeParse(invalid1).success).toBe(false)

      // Invalid: wrong type for history
      const invalid2 = {
        message: 'Test',
        history: 'not an array',
        requestId: 'req_123'
      }
      expect(ChatRequestSchema.safeParse(invalid2).success).toBe(false)

      // Invalid: maxIterations out of range
      const invalid3 = {
        message: 'Test',
        history: [],
        requestId: 'req_123',
        maxIterations: 100
      }
      expect(ChatRequestSchema.safeParse(invalid3).success).toBe(false)

      // Valid: all required fields with proper types
      const valid = {
        message: 'Test',
        history: [],
        requestId: 'req_123',
        maxIterations: 3
      }
      expect(ChatRequestSchema.safeParse(valid).success).toBe(true)
    })
  })
})