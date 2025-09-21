import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { spawn } from 'child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// MCP client instance
let mcpClient: Client | null = null

async function getMCPClient() {
  if (!mcpClient) {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'mcp/server.ts'],
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

// Convert MCP tools to Claude tool format
function convertMCPToolsToClaudeFormat(mcpTools: any[]) {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }))
}

// Execute MCP tool
async function executeMCPTool(client: Client, name: string, args: any) {
  const result = await client.request({
    method: 'tools/call',
    params: {
      name,
      arguments: args
    }
  }, z.any())

  return result
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get MCP client and available tools
    const client = await getMCPClient()
    const toolsResponse = await client.request({
      method: 'tools/list',
      params: {}
    }, z.object({
      tools: z.array(z.object({
        name: z.string(),
        description: z.string(),
        inputSchema: z.any()
      }))
    }))

    const tools = convertMCPToolsToClaudeFormat(toolsResponse.tools || [])

    // Create conversation with Claude
    const systemPrompt = `You are a helpful Todo Manager assistant. You can help users manage their todos using the following tools:
- list_todos: List and filter todos
- create_todo: Create new todos
- update_todo: Update existing todos
- delete_todo: Delete todos
- get_todo: Get details of a specific todo

When users ask to manage todos, use these tools to help them. Be conversational and helpful.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      tools: tools as any,
    })

    // Handle tool use
    let finalResponse = response.content[0]

    if (response.content[0].type === 'tool_use') {
      const toolUse = response.content[0] as any
      const toolResult = await executeMCPTool(
        client,
        toolUse.name,
        toolUse.input
      )

      // Get Claude's response after tool execution
      const followUpResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          },
          {
            role: 'assistant',
            content: response.content
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(toolResult)
              }
            ]
          }
        ],
        tools: tools as any,
      })

      finalResponse = followUpResponse.content[0]
    }

    return NextResponse.json({
      response: finalResponse.type === 'text' ? finalResponse.text : 'I processed your request.'
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}