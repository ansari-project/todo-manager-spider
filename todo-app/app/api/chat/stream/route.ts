import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'
import {
  ChatRequestSchema,
  ChatMessage,
  generateRunId,
  validateRoleAlternation,
  formatMessagesForClaude
} from '@/lib/chat-types'
import { TodoFormatter } from '@/lib/todo-formatter'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// MCP client instance
let mcpClient: Client | null = null
let cachedTools: any[] | null = null
let toolsCacheTime: number = 0
const TOOLS_CACHE_TTL = 60000 // 1 minute cache

async function getMCPClient() {
  if (!mcpClient) {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/mcp/server.js'],
    })

    mcpClient = new Client({
      name: 'todo-chat-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    })

    await mcpClient.connect(transport)
  }
  return mcpClient
}

async function getTools(client: Client) {
  const now = Date.now()
  if (cachedTools && (now - toolsCacheTime) < TOOLS_CACHE_TTL) {
    return cachedTools
  }

  const toolsResponse = await client.request({
    method: 'tools/list',
    params: {}
  }, z.object({
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      inputSchema: z.any()
    }))
  }) as any)

  cachedTools = toolsResponse.tools || []
  toolsCacheTime = now
  return cachedTools
}

function convertMCPToolsToClaudeFormat(mcpTools: any[]) {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }))
}

async function executeMCPTool(client: Client, name: string, args: any) {
  const result = await client.request({
    method: 'tools/call',
    params: {
      name,
      arguments: args
    }
  }, z.any() as any)

  // Format the result if it's a todo-related tool
  if (['list_todos', 'get_todo', 'create_todo', 'update_todo'].includes(name)) {
    const formatted = TodoFormatter.extractFromToolResult(JSON.stringify(result))
    if (formatted.success) {
      return {
        ...result,
        _formatted: formatted.message
      }
    }
  }

  return result
}

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

Available tools:
- list_todos: List and filter todos
- create_todo: Create new todos
- update_todo: Update existing todos
- delete_todo: Delete todos
- get_todo: Get details of a specific todo`

function dedupeKey(name: string, args: any): string {
  return `${name}:${JSON.stringify(args)}`
}

// Streaming response encoder
const encoder = new TextEncoder()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const controller = new AbortController()
  let timeout: NodeJS.Timeout | undefined

  // Create a ReadableStream for streaming responses
  const stream = new ReadableStream({
    async start(streamController) {
      try {
        // Parse and validate request
        const body = await request.json()
        const parsed = ChatRequestSchema.safeParse(body)

        if (!parsed.success) {
          streamController.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() })}\n\n`
          ))
          streamController.close()
          return
        }

        const { message, history, requestId, maxIterations } = parsed.data
        const run_id = parsed.data.run_id || generateRunId(requestId)

        // Send initial acknowledgment
        streamController.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'start', run_id, message: 'Processing your request...' })}\n\n`
        ))

        // Validate role alternation
        if (!validateRoleAlternation(history)) {
          streamController.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: 'Invalid conversation history: roles must alternate' })}\n\n`
          ))
          streamController.close()
          return
        }

        // Get MCP client and tools
        const client = await getMCPClient()
        const mcpTools = await getTools(client)
        const claudeTools = convertMCPToolsToClaudeFormat(mcpTools || [])

        // Build conversation with full history
        const messages: ChatMessage[] = [...history]

        // Add current user message if not already in history
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== message) {
          messages.push({ role: 'user', content: message })
        }

        // Agentic loop implementation with streaming
        const MAX_ITER = maxIterations
        const DEADLINE_MS = 20000
        const deadline = startTime + DEADLINE_MS
        const executed = new Set<string>()
        const toolsExecuted: string[] = []
        let iterations = 0
        let finalResponse = ''
        const historyDelta: ChatMessage[] = []

        // Set up timeout
        timeout = setTimeout(() => controller.abort(), DEADLINE_MS)

        // Convert messages for Claude API
        let claudeMessages = formatMessagesForClaude(messages)

        while (iterations < MAX_ITER && Date.now() < deadline) {
          iterations++

          // Send iteration update
          streamController.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'iteration',
              iteration: iterations,
              maxIterations: MAX_ITER,
              message: `Thinking... (step ${iterations}/${MAX_ITER})`
            })}\n\n`
          ))

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            temperature: 0,
            system: SYSTEM_PROMPT,
            messages: claudeMessages,
            tools: claudeTools as any,
          }, {
            signal: controller.signal as any,
          })

          // Add assistant response to history
          claudeMessages.push({ role: 'assistant', content: response.content })
          historyDelta.push({ role: 'assistant', content: response.content })

          // Check for tool use
          const toolUses = response.content.filter((c: any) => c.type === 'tool_use')

          if (toolUses.length === 0) {
            // No tools requested, we're done
            const textContent = response.content.find((c: any) => c.type === 'text') as any
            finalResponse = textContent?.text || 'I processed your request.'
            break
          }

          // Stream tool execution status
          streamController.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'tools',
              tools: toolUses.map((t: any) => t.name),
              message: `Executing ${toolUses.length} tool${toolUses.length > 1 ? 's' : ''}...`
            })}\n\n`
          ))

          // Execute all tool uses in parallel
          const toolResults = await Promise.all(
            toolUses.map(async (toolUse: any) => {
              const key = dedupeKey(toolUse.name, toolUse.input)

              // Check for duplicate
              if (executed.has(key)) {
                return {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: 'Duplicate tool call skipped' }),
                  is_error: true
                }
              }

              executed.add(key)
              toolsExecuted.push(toolUse.name)

              try {
                const result = await executeMCPTool(client, toolUse.name, toolUse.input)

                // Stream individual tool completion
                streamController.enqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'tool_complete',
                    tool: toolUse.name,
                    message: `✓ ${toolUse.name} completed`
                  })}\n\n`
                ))

                const content = result._formatted
                  ? `${JSON.stringify(result)}\n\n[Formatted Output]:\n${result._formatted}`
                  : JSON.stringify(result)

                return {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content
                }
              } catch (error: any) {
                return {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: error?.message || String(error) }),
                  is_error: true
                }
              }
            })
          )

          // Add tool results to conversation
          claudeMessages.push({
            role: 'user',
            content: toolResults
          })
          historyDelta.push({
            role: 'user',
            content: toolResults
          })
        }

        // If we exited due to limits and don't have a final response, get one
        if (!finalResponse) {
          streamController.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'finalizing',
              message: 'Preparing response...'
            })}\n\n`
          ))

          const concludeResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 512,
            temperature: 0,
            system: SYSTEM_PROMPT,
            messages: claudeMessages,
            tools: claudeTools as any,
            signal: controller.signal as any,
          })

          const textContent = concludeResponse.content.find((c: any) => c.type === 'text') as any
          finalResponse = textContent?.text || 'I processed your request based on the available tool results.'
        }

        // Clear timeout
        if (timeout) clearTimeout(timeout)

        // Send final response
        streamController.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            response: finalResponse,
            run_id,
            iterations,
            toolsExecuted: [...new Set(toolsExecuted)],
            historyDelta,
            duration: Date.now() - startTime
          })}\n\n`
        ))

        streamController.close()

      } catch (error: any) {
        if (timeout) clearTimeout(timeout)

        // Send error
        streamController.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: error.name === 'AbortError'
              ? 'Request timed out after 20 seconds'
              : 'Failed to process chat message',
            details: error.message
          })}\n\n`
        ))

        streamController.close()
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