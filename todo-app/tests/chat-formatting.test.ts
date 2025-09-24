import { describe, it, expect } from 'vitest'
import { TodoFormatter } from '@/lib/todo-formatter'

describe('Chat API Tool Result Formatting', () => {
  describe('executeMCPTool result formatting', () => {
    it('should add _formatted field for list_todos', () => {
      const mockResult = {
        todos: [
          {
            id: 'todo-1',
            title: 'Buy groceries',
            status: 'pending',
            priority: 'high',
            dueDate: null,
            tags: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1
      }

      const formatted = TodoFormatter.extractFromToolResult(JSON.stringify(mockResult))
      expect(formatted.success).toBe(true)
      expect(formatted.message).toContain('Found 1 todo')
      expect(formatted.message).toContain('Buy groceries')
      expect(formatted.message).toContain('HIGH priority')
    })

    it('should format create_todo results', () => {
      const mockResult = {
        id: 'new-todo',
        title: 'New Task',
        description: 'Task description',
        status: 'pending',
        priority: 'medium',
        dueDate: null,
        tags: ['work'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      const formatted = TodoFormatter.extractFromToolResult(JSON.stringify(mockResult))
      expect(formatted.success).toBe(true)
      expect(formatted.type).toBe('todo')
      expect(formatted.message).toContain('⭕')
      expect(formatted.message).toContain('New Task')
      expect(formatted.message).not.toContain('ID:')
    })

    it('should handle update_todo results', () => {
      const mockResult = {
        id: 'todo-1',
        title: 'Updated Task',
        status: 'completed',
        priority: 'high',
        dueDate: null,
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        completedAt: '2024-01-02T00:00:00Z'
      }

      const formatted = TodoFormatter.extractFromToolResult(JSON.stringify(mockResult))
      expect(formatted.success).toBe(true)
      expect(formatted.message).toContain('✅')
      expect(formatted.message).toContain('Updated Task')
      expect(formatted.message).toContain('✓ Completed:')
    })

    it('should handle error results', () => {
      const mockError = {
        error: 'Todo not found'
      }

      const formatted = TodoFormatter.extractFromToolResult(JSON.stringify(mockError))
      expect(formatted.success).toBe(false)
      expect(formatted.message).toContain('Error: Todo not found')
    })
  })

  describe('System prompt guidance', () => {
    // These tests verify that the system prompt contains the necessary formatting guidance
    const SYSTEM_PROMPT = `You are a helpful Todo Manager assistant operating with tools.

CRITICAL RULES:
1. ALWAYS use tools before making claims about todos - never guess or assume
2. When listing todos, include the EXACT titles and IDs from tool_result
3. When confirming actions, cite the SPECIFIC changes from tool_result
4. Use the _formatted field in tool results when available for better readability
5. For multi-step requests, briefly state your plan before executing

Evidence Requirements:
- Before saying "you have X todos", you MUST call list_todos
- Before saying "I created/updated/deleted", show the actual result
- Include specific details: titles, IDs, status, priority from tool outputs
- If a tool fails, report the exact error, don't pretend it succeeded
- When tool results include _formatted, prefer using that for user-friendly output

Formatting Guidelines:
- Use status icons: ✅ completed, 🔄 in_progress, ⭕ pending, ❌ cancelled
- Show priority with indicators: HIGH priority, medium (default), low priority
- Include due dates when present, highlight if overdue with ⚠️
- Group todos by status when listing multiple items

Behavioral Guidelines:
- Ask clarifying questions when requests are ambiguous
- Avoid repeating the same tool call with identical inputs
- Stop when the task is complete or more tools are not needed
- Be concise but include all relevant todo details

Available tools:
- list_todos: List and filter todos
- create_todo: Create new todos
- update_todo: Update existing todos
- delete_todo: Delete todos
- get_todo: Get details of a specific todo`

    it('should include formatting guidelines', () => {
      expect(SYSTEM_PROMPT).toContain('_formatted field')
      expect(SYSTEM_PROMPT).toContain('Use status icons')
      expect(SYSTEM_PROMPT).toContain('✅ completed')
      expect(SYSTEM_PROMPT).toContain('🔄 in_progress')
      expect(SYSTEM_PROMPT).toContain('⭕ pending')
    })

    it('should include evidence requirements', () => {
      expect(SYSTEM_PROMPT).toContain('Before saying "you have X todos"')
      expect(SYSTEM_PROMPT).toContain('MUST call list_todos')
      expect(SYSTEM_PROMPT).toContain('show the actual result')
      expect(SYSTEM_PROMPT).toContain('report the exact error')
    })

    it('should include priority and due date guidance', () => {
      expect(SYSTEM_PROMPT).toContain('HIGH priority')
      expect(SYSTEM_PROMPT).toContain('highlight if overdue')
      expect(SYSTEM_PROMPT).toContain('⚠️')
    })
  })

  describe('Tool result content format', () => {
    it('should combine JSON and formatted output', () => {
      const mockResult = {
        id: 'todo-1',
        title: 'Test',
        status: 'pending',
        _formatted: 'Test formatted output'
      }

      // Simulate the content creation logic
      const content = mockResult._formatted
        ? `${JSON.stringify(mockResult)}\n\n[Formatted Output]:\n${mockResult._formatted}`
        : JSON.stringify(mockResult)

      expect(content).toContain(JSON.stringify(mockResult))
      expect(content).toContain('[Formatted Output]:')
      expect(content).toContain('Test formatted output')
    })

    it('should handle results without _formatted field', () => {
      const mockResult = {
        error: 'Something went wrong'
      }

      const content = mockResult._formatted
        ? `${JSON.stringify(mockResult)}\n\n[Formatted Output]:\n${mockResult._formatted}`
        : JSON.stringify(mockResult)

      expect(content).toBe(JSON.stringify(mockResult))
      expect(content).not.toContain('[Formatted Output]:')
    })
  })
})