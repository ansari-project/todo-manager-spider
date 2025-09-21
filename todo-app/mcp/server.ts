import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js'
import { db } from '../db/client'
import { todos } from '../db/schema'
import { eq, and, gte, lte, desc, asc, like, or } from 'drizzle-orm'
import { z } from 'zod'

// Tool schemas
const listTodosSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  search: z.string().optional(),
  sort: z.enum(['created', 'due', 'priority']).optional(),
  order: z.enum(['asc', 'desc']).optional()
})

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending')
})

const updateTodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional()
})

const deleteTodoSchema = z.object({
  id: z.string().uuid()
})

const getTodoSchema = z.object({
  id: z.string().uuid()
})

// Create MCP server
const server = new Server(
  {
    name: 'todo-manager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_todos',
        description: 'List todos with optional filtering and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'Filter by status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Filter by priority'
            },
            search: {
              type: 'string',
              description: 'Search in title and description'
            },
            sort: {
              type: 'string',
              enum: ['created', 'due', 'priority'],
              description: 'Sort field'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order'
            }
          }
        }
      },
      {
        name: 'create_todo',
        description: 'Create a new todo item',
        inputSchema: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Todo title (max 200 chars)'
            },
            description: {
              type: 'string',
              description: 'Todo description (max 1000 chars)'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: 'Priority level'
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO format'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              default: 'pending',
              description: 'Initial status'
            }
          }
        }
      },
      {
        name: 'update_todo',
        description: 'Update an existing todo item',
        inputSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID to update'
            },
            title: {
              type: 'string',
              description: 'New title'
            },
            description: {
              type: 'string',
              description: 'New description'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'New priority'
            },
            dueDate: {
              type: 'string',
              description: 'New due date in ISO format'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'New status'
            }
          }
        }
      },
      {
        name: 'delete_todo',
        description: 'Delete a todo item',
        inputSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID to delete'
            }
          }
        }
      },
      {
        name: 'get_todo',
        description: 'Get a specific todo by ID',
        inputSchema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID to retrieve'
            }
          }
        }
      }
    ]
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'list_todos': {
        const params = listTodosSchema.parse(args)
        const conditions = []

        if (params.status) {
          conditions.push(eq(todos.status, params.status))
        }
        if (params.priority) {
          conditions.push(eq(todos.priority, params.priority))
        }
        if (params.search) {
          conditions.push(
            or(
              like(todos.title, `%${params.search}%`),
              like(todos.description, `%${params.search}%`)
            )
          )
        }

        // Build and execute query
        let finalQuery = db.select().from(todos)

        if (conditions.length > 0) {
          finalQuery = finalQuery.where(and(...conditions)) as any
        }

        // Apply sorting
        const sortField = params.sort || 'created'
        const sortOrder = params.order || 'desc'

        switch (sortField) {
          case 'created':
            finalQuery = (sortOrder === 'asc'
              ? finalQuery.orderBy(asc(todos.createdAt))
              : finalQuery.orderBy(desc(todos.createdAt))) as any
            break
          case 'due':
            finalQuery = (sortOrder === 'asc'
              ? finalQuery.orderBy(asc(todos.dueDate))
              : finalQuery.orderBy(desc(todos.dueDate))) as any
            break
          case 'priority':
            finalQuery = finalQuery.orderBy(todos.priority) as any
            break
        }

        const result = await finalQuery
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      }

      case 'create_todo': {
        const params = createTodoSchema.parse(args)
        const todo = {
          ...params,
          dueDate: params.dueDate ? new Date(params.dueDate) : undefined
        }

        const result = await db.insert(todos).values(todo).returning()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result[0], null, 2)
            }
          ]
        }
      }

      case 'update_todo': {
        const params = updateTodoSchema.parse(args)
        const { id, ...updates } = params

        const updateData: any = { ...updates }
        if (updates.dueDate !== undefined) {
          updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
        }
        if (updates.status === 'completed') {
          updateData.completedAt = new Date()
        } else if (updates.status) {
          updateData.completedAt = null
        }

        const result = await db
          .update(todos)
          .set(updateData)
          .where(eq(todos.id, id))
          .returning()

        if (result.length === 0) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Todo with ID ${id} not found`
          )
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result[0], null, 2)
            }
          ]
        }
      }

      case 'delete_todo': {
        const params = deleteTodoSchema.parse(args)
        const result = await db
          .delete(todos)
          .where(eq(todos.id, params.id))
          .returning()

        if (result.length === 0) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Todo with ID ${params.id} not found`
          )
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted todo: ${result[0].title}`
            }
          ]
        }
      }

      case 'get_todo': {
        const params = getTodoSchema.parse(args)
        const result = await db
          .select()
          .from(todos)
          .where(eq(todos.id, params.id))
          .limit(1)

        if (result.length === 0) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Todo with ID ${params.id} not found`
          )
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result[0], null, 2)
            }
          ]
        }
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.message}`
      )
    }
    if (error instanceof McpError) {
      throw error
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error}`
    )
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Todo Manager MCP Server running on stdio')
}

main().catch(console.error)