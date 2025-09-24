/**
 * TodoFormatter utility for formatting todo data from tool results
 * Provides consistent, human-readable formatting of todo items
 */

export interface TodoItem {
  id: string
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string | null
  tags?: string[] | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

export interface TodoListResult {
  todos: TodoItem[]
  total: number
  filtered?: number
}

export class TodoFormatter {
  /**
   * Format a single todo item for display
   */
  static formatTodo(todo: TodoItem): string {
    const parts: string[] = []

    // Title with status indicator
    const statusIcon = this.getStatusIcon(todo.status)
    parts.push(`${statusIcon} "${todo.title}"`)

    // Priority if not medium
    if (todo.priority !== 'medium') {
      parts.push(`[${todo.priority.toUpperCase()} priority]`)
    }

    // Status if not pending
    if (todo.status !== 'pending') {
      parts.push(`- ${todo.status.replace('_', ' ')}`)
    }

    // Due date if present
    if (todo.dueDate) {
      const date = new Date(todo.dueDate)
      const isOverdue = date < new Date() && todo.status !== 'completed'
      const dateStr = date.toLocaleDateString()
      parts.push(isOverdue ? `⚠️ Due: ${dateStr}` : `Due: ${dateStr}`)
    }

    // Completed timestamp
    if (todo.completedAt) {
      const date = new Date(todo.completedAt)
      parts.push(`✓ Completed: ${date.toLocaleString()}`)
    }

    return parts.join(' ')
  }

  /**
   * Format a list of todos
   */
  static formatTodoList(result: TodoListResult | TodoItem[]): string {
    const todos = Array.isArray(result) ? result : result.todos
    const total = Array.isArray(result) ? result.length : result.total

    if (todos.length === 0) {
      return 'No todos found.'
    }

    const lines: string[] = []

    // Summary
    const completed = todos.filter(t => t.status === 'completed').length
    const pending = todos.filter(t => t.status === 'pending').length
    const inProgress = todos.filter(t => t.status === 'in_progress').length

    lines.push(`Found ${total} todo${total !== 1 ? 's' : ''}:`)

    if (total > 0) {
      const summary: string[] = []
      if (pending > 0) summary.push(`${pending} pending`)
      if (inProgress > 0) summary.push(`${inProgress} in progress`)
      if (completed > 0) summary.push(`${completed} completed`)
      lines.push(`(${summary.join(', ')})`)
    }

    lines.push('') // Empty line

    // Group by status for better readability
    const grouped = this.groupByStatus(todos)

    for (const [status, items] of Object.entries(grouped)) {
      if (items.length > 0) {
        lines.push(`${this.getStatusLabel(status as any)}:`)
        items.forEach(todo => {
          lines.push(`  ${this.formatTodo(todo)}`)
        })
        lines.push('') // Empty line between groups
      }
    }

    return lines.join('\n').trim()
  }

  /**
   * Format a comparison showing what changed
   */
  static formatComparison(before: TodoItem, after: TodoItem): string {
    const changes: string[] = []

    changes.push(`Updated todo "${after.title}":`)

    if (before.title !== after.title) {
      changes.push(`  Title: "${before.title}" → "${after.title}"`)
    }

    if (before.status !== after.status) {
      changes.push(`  Status: ${before.status} → ${after.status}`)
    }

    if (before.priority !== after.priority) {
      changes.push(`  Priority: ${before.priority} → ${after.priority}`)
    }

    if (before.dueDate !== after.dueDate) {
      const beforeDate = before.dueDate ? new Date(before.dueDate).toLocaleDateString() : 'none'
      const afterDate = after.dueDate ? new Date(after.dueDate).toLocaleDateString() : 'none'
      changes.push(`  Due date: ${beforeDate} → ${afterDate}`)
    }

    if (after.completedAt && !before.completedAt) {
      changes.push(`  ✓ Marked as completed at ${new Date(after.completedAt).toLocaleString()}`)
    }

    return changes.join('\n')
  }

  /**
   * Extract key information from tool result
   */
  static extractFromToolResult(toolResult: string): any {
    try {
      const parsed = JSON.parse(toolResult)

      // Handle error responses
      if (parsed.error) {
        return {
          success: false,
          error: parsed.error,
          message: `Error: ${parsed.error}`
        }
      }

      // Handle todo or todo list
      if (parsed.id && parsed.title) {
        // Single todo
        return {
          success: true,
          type: 'todo',
          data: parsed as TodoItem,
          message: this.formatTodo(parsed as TodoItem)
        }
      }

      if (Array.isArray(parsed)) {
        // List of todos
        return {
          success: true,
          type: 'list',
          data: parsed,
          message: this.formatTodoList(parsed)
        }
      }

      if (parsed.todos && Array.isArray(parsed.todos)) {
        // List result with metadata
        return {
          success: true,
          type: 'list',
          data: parsed,
          message: this.formatTodoList(parsed as TodoListResult)
        }
      }

      // Generic success
      return {
        success: true,
        data: parsed,
        message: JSON.stringify(parsed, null, 2)
      }

    } catch (e) {
      // Not JSON or parsing failed
      return {
        success: false,
        error: 'Failed to parse tool result',
        message: toolResult
      }
    }
  }

  /**
   * Helper: Get status icon
   */
  private static getStatusIcon(status: TodoItem['status']): string {
    switch (status) {
      case 'completed': return '✅'
      case 'in_progress': return '🔄'
      case 'cancelled': return '❌'
      default: return '⭕'
    }
  }

  /**
   * Helper: Get status label
   */
  private static getStatusLabel(status: TodoItem['status']): string {
    switch (status) {
      case 'completed': return '✅ Completed'
      case 'in_progress': return '🔄 In Progress'
      case 'cancelled': return '❌ Cancelled'
      default: return '⭕ Pending'
    }
  }

  /**
   * Helper: Group todos by status
   */
  private static groupByStatus(todos: TodoItem[]): Record<string, TodoItem[]> {
    const groups: Record<string, TodoItem[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: []
    }

    for (const todo of todos) {
      groups[todo.status].push(todo)
    }

    return groups
  }

  /**
   * Format error from tool execution
   */
  static formatError(error: any): string {
    if (typeof error === 'string') {
      return `❌ Error: ${error}`
    }

    if (error.message) {
      return `❌ Error: ${error.message}`
    }

    return `❌ An error occurred: ${JSON.stringify(error)}`
  }

  /**
   * Create a summary of todos
   */
  static createSummary(todos: TodoItem[]): string {
    if (todos.length === 0) {
      return 'You have no todos.'
    }

    const stats = {
      total: todos.length,
      pending: todos.filter(t => t.status === 'pending').length,
      inProgress: todos.filter(t => t.status === 'in_progress').length,
      completed: todos.filter(t => t.status === 'completed').length,
      highPriority: todos.filter(t => t.priority === 'high' && t.status !== 'completed').length,
      overdue: todos.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false
        return new Date(t.dueDate) < new Date()
      }).length
    }

    const parts: string[] = []

    parts.push(`You have ${stats.total} todo${stats.total !== 1 ? 's' : ''} total`)

    if (stats.pending > 0) {
      parts.push(`${stats.pending} pending`)
    }

    if (stats.inProgress > 0) {
      parts.push(`${stats.inProgress} in progress`)
    }

    if (stats.highPriority > 0) {
      parts.push(`⚠️ ${stats.highPriority} high priority`)
    }

    if (stats.overdue > 0) {
      parts.push(`🔴 ${stats.overdue} overdue`)
    }

    return parts.join(', ') + '.'
  }
}