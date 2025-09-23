import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { formatMessagesForClaude } from '@/lib/chat-types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// System prompt for Claude
const SYSTEM_PROMPT = `You are a helpful todo management assistant. You can help users manage their todos using the available tools.

CRITICAL RULES:
1. ALWAYS use tools before making claims about todos - never guess or assume
2. When listing todos, include the EXACT titles and IDs from tool results
3. When confirming actions, cite the SPECIFIC changes from tool results
4. Be concise and helpful in your responses
5. When updating multiple todos, ALWAYS call todo_list first to get the current IDs
6. Use the actual IDs from the todos array returned by todo_list, not made-up IDs

Available tools:
- todo_list: List and filter todos (returns todos array with id, title, etc.)
- todo_create: Create new todos
- todo_update: Update existing todos (requires exact ID from todo_list)
- todo_delete: Delete todos`

// This route handles continuation of chat conversations after tool execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, toolResults } = body

    // If no API key, return a simple response
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        response: "Great! I've completed that task for you. Is there anything else you'd like to do with your todos?"
      })
    }

    // Build the conversation with tool results
    const conversationMessages = [
      ...messages,
      {
        role: 'user',
        content: toolResults.map((result: any) => ({
          type: 'tool_result',
          tool_use_id: result.tool_use_id,
          content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
        }))
      }
    ]

    // Format for Claude API
    const claudeMessages = formatMessagesForClaude(conversationMessages)

    // Define Claude tools for the continuation
    const claudeTools = [
      {
        name: 'todo_list',
        description: 'List todos with optional filtering',
        input_schema: {
          type: 'object' as const,
          properties: {
            status: { type: 'string' as const, enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string' as const, enum: ['low', 'medium', 'high'] }
          }
        }
      },
      {
        name: 'todo_update',
        description: 'Update an existing todo',
        input_schema: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const, description: 'Todo ID' },
            title: { type: 'string' as const },
            description: { type: 'string' as const },
            status: { type: 'string' as const, enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string' as const, enum: ['low', 'medium', 'high'] }
          },
          required: ['id']
        }
      },
      {
        name: 'todo_create',
        description: 'Create a new todo item',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const },
            description: { type: 'string' as const },
            priority: { type: 'string' as const, enum: ['low', 'medium', 'high'] }
          },
          required: ['title']
        }
      },
      {
        name: 'todo_delete',
        description: 'Delete a todo',
        input_schema: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const }
          },
          required: ['id']
        }
      }
    ]

    // Get Claude's response after tool execution with tools available
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
      tools: claudeTools as any
    })

    // Check if Claude wants to use more tools
    const hasToolUse = response.content.some((c: any) => c.type === 'tool_use')

    if (hasToolUse) {
      // Claude needs more tools - return tool request for client to execute
      const toolRequests = response.content
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          input: c.input
        }))

      return NextResponse.json({
        needsMoreTools: true,
        toolRequests,
        assistantContent: response.content
      })
    }

    // Extract text response
    const textContent = response.content.find((c: any) => c.type === 'text') as any
    const finalResponse = textContent?.text || "I've completed that task for you."

    return NextResponse.json({
      response: finalResponse,
      toolResults
    })
  } catch (error) {
    console.error('Chat continue error:', error)
    return NextResponse.json({
      response: "I've executed the todo operation. The task should be completed.",
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Chat continuation endpoint',
    method: 'POST'
  })
}