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

Available tools:
- todo_list: List and filter todos
- todo_create: Create new todos
- todo_update: Update existing todos
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

    // Get Claude's response after tool execution
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    })

    // Extract text response
    const textContent = response.content.find((c: any) => c.type === 'text')
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