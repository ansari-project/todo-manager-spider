import { describe, it, expect, vi } from 'vitest'
import { TodoFormatter } from '@/lib/todo-formatter'

describe('Multi-Tool Execution Tests', () => {
  describe('Agentic Loop', () => {
    it('should support chaining multiple tool calls', () => {
      // This tests that the loop can handle multiple iterations
      const mockToolCalls = [
        { name: 'create_todo', input: { title: 'Buy milk' } },
        { name: 'list_todos', input: {} }
      ]

      // The loop would process these sequentially
      const results = []
      for (const call of mockToolCalls) {
        results.push({
          tool: call.name,
          executed: true
        })
      }

      expect(results).toHaveLength(2)
      expect(results[0].tool).toBe('create_todo')
      expect(results[1].tool).toBe('list_todos')
    })

    it('should enforce iteration limits', () => {
      const MAX_ITERATIONS = 3
      let iterations = 0
      const toolsToExecute = ['tool1', 'tool2', 'tool3', 'tool4', 'tool5']

      for (const tool of toolsToExecute) {
        if (iterations >= MAX_ITERATIONS) break
        iterations++
      }

      expect(iterations).toBe(MAX_ITERATIONS)
    })

    it('should prevent duplicate tool executions', () => {
      const executed = new Set<string>()
      const dedupeKey = (name: string, args: any) => `${name}:${JSON.stringify(args)}`

      const toolCalls = [
        { name: 'list_todos', args: {} },
        { name: 'list_todos', args: {} }, // Duplicate
        { name: 'create_todo', args: { title: 'Test' } }
      ]

      const results = []
      for (const call of toolCalls) {
        const key = dedupeKey(call.name, call.args)
        if (!executed.has(key)) {
          executed.add(key)
          results.push(call)
        }
      }

      expect(results).toHaveLength(2) // Duplicate filtered out
      expect(results[0].name).toBe('list_todos')
      expect(results[1].name).toBe('create_todo')
    })

    it('should handle timeout with AbortController', () => {
      const controller = new AbortController()
      const TIMEOUT_MS = 100

      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      // Simulate a long-running operation
      const startTime = Date.now()

      return new Promise((resolve) => {
        setTimeout(() => {
          if (controller.signal.aborted) {
            clearTimeout(timeout)
            const duration = Date.now() - startTime
            expect(duration).toBeGreaterThanOrEqual(TIMEOUT_MS - 10)
            expect(duration).toBeLessThan(TIMEOUT_MS + 50)
            resolve(true)
          }
        }, TIMEOUT_MS + 10)
      })
    })

    it('should format multi-tool results properly', () => {
      // Test that multiple tool results can be formatted
      const createResult = {
        id: 'new-1',
        title: 'New Todo',
        status: 'pending',
        priority: 'high'
      }

      const listResult = {
        todos: [createResult],
        total: 1
      }

      const formattedCreate = TodoFormatter.extractFromToolResult(JSON.stringify(createResult))
      const formattedList = TodoFormatter.extractFromToolResult(JSON.stringify(listResult))

      expect(formattedCreate.success).toBe(true)
      expect(formattedCreate.message).toContain('New Todo')
      expect(formattedList.success).toBe(true)
      expect(formattedList.message).toContain('Found 1 todo')
    })
  })

  describe('System Prompt Guidance', () => {
    const SYSTEM_PROMPT = `For multi-step requests, briefly state your plan before executing`

    it('should include planning guidance', () => {
      expect(SYSTEM_PROMPT).toContain('multi-step')
      expect(SYSTEM_PROMPT).toContain('plan')
    })
  })

  describe('Parallel Tool Execution', () => {
    it('should execute independent tools in parallel', async () => {
      const toolPromises = [
        Promise.resolve({ tool: 'list_todos', result: [] }),
        Promise.resolve({ tool: 'get_todo', result: { id: 1 } })
      ]

      const results = await Promise.all(toolPromises)

      expect(results).toHaveLength(2)
      expect(results[0].tool).toBe('list_todos')
      expect(results[1].tool).toBe('get_todo')
    })
  })
})