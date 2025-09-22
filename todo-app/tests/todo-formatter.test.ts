import { TodoFormatter, TodoItem, TodoListResult } from '@/lib/todo-formatter'

describe('TodoFormatter', () => {
  const mockTodo: TodoItem = {
    id: 'todo-1',
    title: 'Test Todo',
    description: 'Test description',
    status: 'pending',
    priority: 'medium',
    dueDate: null,
    tags: ['test'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  describe('formatTodo', () => {
    it('should format a basic pending todo', () => {
      const result = TodoFormatter.formatTodo(mockTodo)
      expect(result).toContain('⭕')
      expect(result).toContain('Test Todo')
      expect(result).toContain('ID: todo-1')
      expect(result).not.toContain('priority') // medium is default
    })

    it('should show high priority indicator', () => {
      const highPriorityTodo = { ...mockTodo, priority: 'high' as const }
      const result = TodoFormatter.formatTodo(highPriorityTodo)
      expect(result).toContain('[HIGH priority]')
    })

    it('should show completed status with icon', () => {
      const completedTodo: TodoItem = {
        ...mockTodo,
        status: 'completed',
        completedAt: '2024-01-02T00:00:00Z'
      }
      const result = TodoFormatter.formatTodo(completedTodo)
      expect(result).toContain('✅')
      expect(result).toContain('✓ Completed:')
    })

    it('should show overdue warning', () => {
      const overdueTodo = {
        ...mockTodo,
        dueDate: '2020-01-01T00:00:00Z'
      }
      const result = TodoFormatter.formatTodo(overdueTodo)
      expect(result).toContain('⚠️ Due:')
    })

    it('should handle in_progress status', () => {
      const inProgressTodo = { ...mockTodo, status: 'in_progress' as const }
      const result = TodoFormatter.formatTodo(inProgressTodo)
      expect(result).toContain('🔄')
      expect(result).toContain('in progress')
    })
  })

  describe('formatTodoList', () => {
    it('should format empty list', () => {
      const result = TodoFormatter.formatTodoList([])
      expect(result).toBe('No todos found.')
    })

    it('should format list with summary', () => {
      const todos: TodoItem[] = [
        mockTodo,
        { ...mockTodo, id: 'todo-2', status: 'completed' },
        { ...mockTodo, id: 'todo-3', status: 'in_progress' }
      ]
      const result = TodoFormatter.formatTodoList(todos)
      expect(result).toContain('Found 3 todos')
      expect(result).toContain('1 pending')
      expect(result).toContain('1 in progress')
      expect(result).toContain('1 completed')
    })

    it('should group todos by status', () => {
      const todos: TodoItem[] = [
        { ...mockTodo, id: 'todo-1', status: 'pending' },
        { ...mockTodo, id: 'todo-2', status: 'pending' },
        { ...mockTodo, id: 'todo-3', status: 'completed' }
      ]
      const result = TodoFormatter.formatTodoList(todos)
      const lines = result.split('\n')

      // Check for status headers
      const fullText = lines.join('\n')
      expect(fullText).toContain('⭕ Pending')
      expect(fullText).toContain('✅ Completed')
    })

    it('should handle TodoListResult format', () => {
      const listResult: TodoListResult = {
        todos: [mockTodo],
        total: 1,
        filtered: 1
      }
      const result = TodoFormatter.formatTodoList(listResult)
      expect(result).toContain('Found 1 todo')
    })
  })

  describe('formatComparison', () => {
    it('should show status change', () => {
      const before = mockTodo
      const after = { ...mockTodo, status: 'completed' as const }
      const result = TodoFormatter.formatComparison(before, after)
      expect(result).toContain('Status: pending → completed')
    })

    it('should show priority change', () => {
      const before = mockTodo
      const after = { ...mockTodo, priority: 'high' as const }
      const result = TodoFormatter.formatComparison(before, after)
      expect(result).toContain('Priority: medium → high')
    })

    it('should show completion timestamp', () => {
      const before = mockTodo
      const after = {
        ...mockTodo,
        status: 'completed' as const,
        completedAt: '2024-01-02T12:00:00Z'
      }
      const result = TodoFormatter.formatComparison(before, after)
      expect(result).toContain('✓ Marked as completed at')
    })

    it('should handle title change', () => {
      const before = mockTodo
      const after = { ...mockTodo, title: 'Updated Title' }
      const result = TodoFormatter.formatComparison(before, after)
      expect(result).toContain('Title: "Test Todo" → "Updated Title"')
    })
  })

  describe('extractFromToolResult', () => {
    it('should extract single todo', () => {
      const toolResult = JSON.stringify(mockTodo)
      const result = TodoFormatter.extractFromToolResult(toolResult)
      expect(result.success).toBe(true)
      expect(result.type).toBe('todo')
      expect(result.data).toEqual(mockTodo)
      expect(result.message).toContain('Test Todo')
    })

    it('should extract todo list', () => {
      const todos = [mockTodo, { ...mockTodo, id: 'todo-2' }]
      const toolResult = JSON.stringify(todos)
      const result = TodoFormatter.extractFromToolResult(toolResult)
      expect(result.success).toBe(true)
      expect(result.type).toBe('list')
      expect(result.data).toEqual(todos)
    })

    it('should handle list result format', () => {
      const listResult: TodoListResult = {
        todos: [mockTodo],
        total: 1
      }
      const toolResult = JSON.stringify(listResult)
      const result = TodoFormatter.extractFromToolResult(toolResult)
      expect(result.success).toBe(true)
      expect(result.type).toBe('list')
      expect(result.data).toEqual(listResult)
    })

    it('should handle error responses', () => {
      const toolResult = JSON.stringify({ error: 'Todo not found' })
      const result = TodoFormatter.extractFromToolResult(toolResult)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Todo not found')
      expect(result.message).toContain('Error: Todo not found')
    })

    it('should handle invalid JSON', () => {
      const toolResult = 'Not valid JSON'
      const result = TodoFormatter.extractFromToolResult(toolResult)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to parse tool result')
      expect(result.message).toBe('Not valid JSON')
    })
  })

  describe('formatError', () => {
    it('should format string errors', () => {
      const result = TodoFormatter.formatError('Connection failed')
      expect(result).toBe('❌ Error: Connection failed')
    })

    it('should format error objects with message', () => {
      const error = { message: 'Database error' }
      const result = TodoFormatter.formatError(error)
      expect(result).toBe('❌ Error: Database error')
    })

    it('should handle unknown error formats', () => {
      const error = { code: 500, status: 'failed' }
      const result = TodoFormatter.formatError(error)
      expect(result).toContain('❌ An error occurred:')
      expect(result).toContain('500')
    })
  })

  describe('createSummary', () => {
    it('should handle empty todos', () => {
      const result = TodoFormatter.createSummary([])
      expect(result).toBe('You have no todos.')
    })

    it('should create basic summary', () => {
      const todos = [
        mockTodo,
        { ...mockTodo, id: 'todo-2', status: 'completed' as const }
      ]
      const result = TodoFormatter.createSummary(todos)
      expect(result).toContain('You have 2 todos total')
      expect(result).toContain('1 pending')
    })

    it('should highlight high priority items', () => {
      const todos = [
        { ...mockTodo, priority: 'high' as const },
        { ...mockTodo, id: 'todo-2', priority: 'high' as const }
      ]
      const result = TodoFormatter.createSummary(todos)
      expect(result).toContain('⚠️ 2 high priority')
    })

    it('should identify overdue items', () => {
      const todos = [
        { ...mockTodo, dueDate: '2020-01-01T00:00:00Z' },
        { ...mockTodo, id: 'todo-2', dueDate: '2020-01-01T00:00:00Z' }
      ]
      const result = TodoFormatter.createSummary(todos)
      expect(result).toContain('🔴 2 overdue')
    })

    it('should not count completed items as overdue', () => {
      const todos = [
        {
          ...mockTodo,
          status: 'completed' as const,
          dueDate: '2020-01-01T00:00:00Z'
        }
      ]
      const result = TodoFormatter.createSummary(todos)
      expect(result).not.toContain('overdue')
    })
  })
})