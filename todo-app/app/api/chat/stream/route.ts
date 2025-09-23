import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  ChatRequestSchema,
  ChatMessage,
  generateRunId,
  validateRoleAlternation,
  formatMessagesForClaude
} from '@/lib/chat-types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Tool definitions for Claude
const claudeTools = [
  {
    name: 'todo_list',
    description: 'List todos with optional filtering',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string' as const,
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Filter by status'
        },
        priority: {
          type: 'string' as const,
          enum: ['low', 'medium', 'high'],
          description: 'Filter by priority'
        }
      }
    }
  },
  {
    name: 'todo_create',
    description: 'Create a new todo item',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string' as const,
          description: 'Todo title'
        },
        description: {
          type: 'string' as const,
          description: 'Todo description'
        },
        priority: {
          type: 'string' as const,
          enum: ['low', 'medium', 'high'],
          description: 'Priority level'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'todo_update',
    description: 'Update an existing todo',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string' as const,
          description: 'Todo ID'
        },
        title: {
          type: 'string' as const,
          description: 'New title'
        },
        description: {
          type: 'string' as const,
          description: 'New description'
        },
        status: {
          type: 'string' as const,
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'New status'
        },
        priority: {
          type: 'string' as const,
          enum: ['low', 'medium', 'high'],
          description: 'New priority'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'todo_delete',
    description: 'Delete a todo',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string' as const,
          description: 'Todo ID'
        }
      },
      required: ['id']
    }
  }
]

// System prompt for Claude
const SYSTEM_PROMPT = `You are a helpful todo management assistant. You can help users manage their todos using the available tools.

CRITICAL RULES:
1. ALWAYS use tools before making claims about todos - never guess or assume
2. When listing todos, include the EXACT titles and IDs from tool results
3. When confirming actions, cite the SPECIFIC changes from tool results
4. Be concise and helpful in your responses

Available tools:
- todo_list: List and filter todos
- todo_create: Create new todos
- todo_update: Update existing todos
- todo_delete: Delete todos`

// Note: Tool execution happens on the client side via Service Worker
// The server just returns tool requests for the client to execute

// Streaming response encoder
const encoder = new TextEncoder()

export async function POST(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse request
        const body = await request.json()
        const parsed = ChatRequestSchema.safeParse(body)

        if (!parsed.success) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              error: 'Invalid request',
              details: parsed.error.flatten()
            })}\n\n`
          ))
          controller.close()
          return
        }

        const { message, history } = parsed.data
        const run_id = parsed.data.run_id || generateRunId(parsed.data.requestId)

        // Send start event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'start',
            run_id,
            message: 'Processing your request...'
          })}\n\n`
        ))

        // Validate history
        if (!validateRoleAlternation(history)) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              error: 'Invalid conversation history'
            })}\n\n`
          ))
          controller.close()
          return
        }

        // Check API key
        if (!process.env.ANTHROPIC_API_KEY) {
          // Provide a simple response without Claude
          const response = "I can help you manage your todos! Use the form above to add todos, click the checkbox to complete them, or use the trash icon to delete them."

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              response,
              historyDelta: [
                { role: 'user', content: message },
                { role: 'assistant', content: response }
              ]
            })}\n\n`
          ))
          controller.close()
          return
        }

        // Build messages for Claude
        const messages = [...history]
        if (!messages.length || messages[messages.length - 1].role !== 'user' || messages[messages.length - 1].content !== message) {
          messages.push({ role: 'user', content: message })
        }

        // Create Claude message
        const claudeMessages = formatMessagesForClaude(messages)

        // Call Claude with tools
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: claudeMessages,
          tools: claudeTools,
        })

        let finalResponse = ''
        const toolsExecuted: string[] = []

        // Check if Claude wants to use tools
        const hasToolUse = response.content.some(c => c.type === 'tool_use')

        if (hasToolUse) {
          // Send tool requests to client for execution
          const toolRequests = response.content
            .filter(c => c.type === 'tool_use')
            .map(c => ({
              id: c.id,
              name: c.name,
              input: c.input
            }))

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'tool_request',
              tools: toolRequests,
              assistantContent: response.content
            })}\n\n`
          ))
        } else {
          // No tools needed, just send the text response
          const textContent = response.content.find(c => c.type === 'text')
          finalResponse = textContent?.text || ''

          // Send complete event
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              response: finalResponse,
              toolsExecuted,
              historyDelta: [
                { role: 'user', content: message },
                { role: 'assistant', content: finalResponse }
              ]
            })}\n\n`
          ))
        }

        // Complete event is now sent in the response processing above

      } catch (error) {
        console.error('Chat API error:', error)
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'An error occurred'
          })}\n\n`
        ))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}