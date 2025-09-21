"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
// Tool schemas
const listTodosSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    search: zod_1.z.string().optional(),
    sort: zod_1.z.enum(['created', 'due', 'priority']).optional(),
    order: zod_1.z.enum(['asc', 'desc']).optional()
});
const createTodoSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
    dueDate: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending')
});
const updateTodoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).nullable().optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    dueDate: zod_1.z.string().datetime().nullable().optional(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional()
});
const deleteTodoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
const getTodoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
// Create MCP server
const server = new index_js_1.Server({
    name: 'todo-manager-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Handle list tools request
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
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
    };
});
// Handle tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'list_todos': {
                const params = listTodosSchema.parse(args);
                const conditions = [];
                if (params.status) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_1.todos.status, params.status));
                }
                if (params.priority) {
                    conditions.push((0, drizzle_orm_1.eq)(schema_1.todos.priority, params.priority));
                }
                if (params.search) {
                    conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.todos.title, `%${params.search}%`), (0, drizzle_orm_1.like)(schema_1.todos.description, `%${params.search}%`)));
                }
                // Build and execute query
                let finalQuery = client_1.db.select().from(schema_1.todos);
                if (conditions.length > 0) {
                    finalQuery = finalQuery.where((0, drizzle_orm_1.and)(...conditions));
                }
                // Apply sorting
                const sortField = params.sort || 'created';
                const sortOrder = params.order || 'desc';
                switch (sortField) {
                    case 'created':
                        finalQuery = sortOrder === 'asc'
                            ? finalQuery.orderBy((0, drizzle_orm_1.asc)(schema_1.todos.createdAt))
                            : finalQuery.orderBy((0, drizzle_orm_1.desc)(schema_1.todos.createdAt));
                        break;
                    case 'due':
                        finalQuery = sortOrder === 'asc'
                            ? finalQuery.orderBy((0, drizzle_orm_1.asc)(schema_1.todos.dueDate))
                            : finalQuery.orderBy((0, drizzle_orm_1.desc)(schema_1.todos.dueDate));
                        break;
                    case 'priority':
                        finalQuery = finalQuery.orderBy(schema_1.todos.priority);
                        break;
                }
                const result = await finalQuery;
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }
            case 'create_todo': {
                const params = createTodoSchema.parse(args);
                const todo = {
                    ...params,
                    dueDate: params.dueDate ? new Date(params.dueDate) : undefined
                };
                const result = await client_1.db.insert(schema_1.todos).values(todo).returning();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result[0], null, 2)
                        }
                    ]
                };
            }
            case 'update_todo': {
                const params = updateTodoSchema.parse(args);
                const { id, ...updates } = params;
                const updateData = { ...updates };
                if (updates.dueDate !== undefined) {
                    updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
                }
                if (updates.status === 'completed') {
                    updateData.completedAt = new Date();
                }
                else if (updates.status) {
                    updateData.completedAt = null;
                }
                const result = await client_1.db
                    .update(schema_1.todos)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.todos.id, id))
                    .returning();
                if (result.length === 0) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Todo with ID ${id} not found`);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result[0], null, 2)
                        }
                    ]
                };
            }
            case 'delete_todo': {
                const params = deleteTodoSchema.parse(args);
                const result = await client_1.db
                    .delete(schema_1.todos)
                    .where((0, drizzle_orm_1.eq)(schema_1.todos.id, params.id))
                    .returning();
                if (result.length === 0) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Todo with ID ${params.id} not found`);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Successfully deleted todo: ${result[0].title}`
                        }
                    ]
                };
            }
            case 'get_todo': {
                const params = getTodoSchema.parse(args);
                const result = await client_1.db
                    .select()
                    .from(schema_1.todos)
                    .where((0, drizzle_orm_1.eq)(schema_1.todos.id, params.id))
                    .limit(1);
                if (result.length === 0) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Todo with ID ${params.id} not found`);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result[0], null, 2)
                        }
                    ]
                };
            }
            default:
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
        }
        if (error instanceof types_js_1.McpError) {
            throw error;
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
});
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Todo Manager MCP Server running on stdio');
}
main().catch(console.error);
