import { NextRequest, NextResponse } from 'next/server'
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

// Get tools with caching
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

// Convert MCP tools to Claude tool format
function convertMCPToolsToClaudeFormat(mcpTools: any[]) {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }))
}

// Execute MCP tool with formatted output
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
        _formatted: formatted.message // Add formatted output for assistant to use
      }
    }
  }

  return result
}

// Enhanced system prompt with evidence-based rules and formatting
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

// Dedupe key for tool execution
function dedupeKey(name: string, args: any): string {
  return `${name}:${JSON.stringify(args)}`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const controller = new AbortController()
  let timeout: NodeJS.Timeout | undefined

  try {
    // Parse and validate request
    const body = await request.json()
    const parsed = ChatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { message, history, requestId, maxIterations } = parsed.data
    const run_id = parsed.data.run_id || generateRunId(requestId)

    // Validate role alternation
    if (!validateRoleAlternation(history)) {
      return NextResponse.json(
        { error: 'Invalid conversation history: roles must alternate' },
        { status: 400 }
      )
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

    // Agentic loop implementation
    const MAX_ITER = maxIterations
    const DEADLINE_MS = 20000
    const deadline = startTime + DEADLINE_MS
    const executed = new Set<string>()
    const toolsExecuted: string[] = []
    let iterations = 0
    let finalResponse = ''
    const historyDelta: ChatMessage[] = [] // Track tool execution history

    // Set up timeout
    timeout = setTimeout(() => controller.abort(), DEADLINE_MS)

    // Convert messages for Claude API
    let claudeMessages = formatMessagesForClaude(messages)

    while (iterations < MAX_ITER && Date.now() < deadline) {
      iterations++
      console.log(`[${run_id}] Iteration ${iterations}`)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
        tools: claudeTools as any,
      }, {
        signal: controller.signal as any, // Add abort signal
      })

      // Add assistant response to history and historyDelta
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

      // Execute all tool uses in parallel
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse: any) => {
          const key = dedupeKey(toolUse.name, toolUse.input)

          // Check for duplicate
          if (executed.has(key)) {
            console.log(`[${run_id}] Skipping duplicate tool call: ${key}`)
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
            console.log(`[${run_id}] Executing tool: ${toolUse.name}`)
            const result = await executeMCPTool(client, toolUse.name, toolUse.input)

            // Include formatted output in the tool result content
            const content = result._formatted
              ? `${JSON.stringify(result)}\n\n[Formatted Output]:\n${result._formatted}`
              : JSON.stringify(result)

            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content
            }
          } catch (error: any) {
            console.error(`[${run_id}] Tool error:`, error)
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: error?.message || String(error) }),
              is_error: true
            }
          }
        })
      )

      // Add tool results to conversation and historyDelta
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
      console.log(`[${run_id}] Getting final response after ${iterations} iterations`)

      const concludeResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
        tools: claudeTools as any,
        signal: controller.signal as any, // Add abort signal
      })

      const textContent = concludeResponse.content.find((c: any) => c.type === 'text') as any
      finalResponse = textContent?.text || 'I processed your request based on the available tool results.'
    }

    // Clear timeout
    clearTimeout(timeout)

    console.log(`[${run_id}] Completed in ${iterations} iterations, ${Date.now() - startTime}ms`)

    return NextResponse.json({
      response: finalResponse,
      run_id,
      iterations,
      toolsExecuted: [...new Set(toolsExecuted)],
      historyDelta // Return tool execution history to merge on frontend
    })

  } catch (error: any) {
    if (timeout) clearTimeout(timeout)

    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.error('Chat API timeout:', error)
      return NextResponse.json(
        { error: 'Request timed out after 20 seconds' },
        { status: 408 }
      )
    }

    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}