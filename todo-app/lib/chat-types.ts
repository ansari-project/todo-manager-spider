import { z } from 'zod'

// Message types for conversation history
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.union([
      z.object({ type: z.literal('text'), text: z.string() }),
      z.object({
        type: z.literal('tool_use'),
        id: z.string(),
        name: z.string(),
        input: z.any()
      }),
      z.object({
        type: z.literal('tool_result'),
        tool_use_id: z.string(),
        content: z.string(),
        is_error: z.boolean().optional()
      })
    ]))
  ]),
  toolCalls: z.array(z.object({
    name: z.string(),
    input: z.any(),
    result: z.any().optional()
  })).optional()
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

// Request schema with conversation history
export const ChatRequestSchema = z.object({
  message: z.string(),
  history: z.array(ChatMessageSchema).default([]),
  requestId: z.string(),
  run_id: z.string().optional(),
  maxIterations: z.number().min(1).max(5).default(3)
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

// Response schema
export const ChatResponseSchema = z.object({
  response: z.string(),
  run_id: z.string(),
  iterations: z.number(),
  toolsExecuted: z.array(z.string()).optional(),
  historyDelta: z.array(ChatMessageSchema).optional(), // New: tool execution history to merge
  error: z.string().optional()
})

export type ChatResponse = z.infer<typeof ChatResponseSchema>

// Utility to generate unique IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

export function generateRunId(requestId: string): string {
  return `run_${requestId}`
}

// Validate role alternation for Claude API
export function validateRoleAlternation(messages: ChatMessage[]): boolean {
  if (messages.length === 0) return true

  let expectedRole: 'user' | 'assistant' = 'user'
  for (const msg of messages) {
    if (msg.role !== expectedRole) {
      // Tool results are exceptions - they're from user but don't break alternation
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const hasToolResult = msg.content.some((c: any) => c.type === 'tool_result')
        if (hasToolResult) continue
      }
      return false
    }
    expectedRole = expectedRole === 'user' ? 'assistant' : 'user'
  }

  return true
}

// Format messages for Claude API
export function formatMessagesForClaude(messages: ChatMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string'
      ? msg.content
      : msg.content
  }))
}