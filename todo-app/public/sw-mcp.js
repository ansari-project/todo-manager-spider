/**
 * Service Worker MCP Implementation
 *
 * This Service Worker acts as a local MCP (Model Context Protocol) server,
 * intercepting requests to /api/mcp/* and handling them locally.
 * This enables the AI to interact with client-side SQLite databases
 * while maintaining full MCP protocol compliance.
 */

// Service Worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[SW-MCP] Installing Service Worker...');

  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-MCP] Activating Service Worker...');

  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept MCP protocol requests
  if (url.pathname.startsWith('/api/mcp/')) {
    console.log('[SW-MCP] Intercepting MCP request:', url.pathname);
    event.respondWith(handleMCPRequest(event.request));
  }
  // Let all other requests pass through
});

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request) {
  try {
    // Parse the JSON-RPC request
    const body = await request.json();
    console.log('[SW-MCP] MCP Request:', body);

    const { jsonrpc, method, params, id } = body;

    // Validate JSON-RPC format
    if (jsonrpc !== '2.0') {
      return createErrorResponse(id, -32600, 'Invalid Request: JSON-RPC version must be 2.0');
    }

    // Route to appropriate handler based on method
    let result;
    switch (method) {
      case 'initialize':
        result = await handleInitialize(params);
        break;

      case 'tools/list':
        result = await handleToolsList(params);
        break;

      case 'tools/call':
        result = await handleToolCall(params);
        break;

      default:
        return createErrorResponse(id, -32601, `Method not found: ${method}`);
    }

    // Return successful response
    return createSuccessResponse(id, result);

  } catch (error) {
    console.error('[SW-MCP] Error handling request:', error);
    return createErrorResponse(null, -32603, 'Internal error: ' + error.message);
  }
}

/**
 * Handle MCP initialize request
 */
async function handleInitialize(params) {
  console.log('[SW-MCP] Initializing with params:', params);

  return {
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'todo-manager-sw-mcp',
      version: '1.0.0'
    },
    capabilities: {
      tools: {}
    }
  };
}

/**
 * Handle tools/list request
 */
async function handleToolsList(params) {
  console.log('[SW-MCP] Listing tools');

  return {
    tools: [
      {
        name: 'todo_create',
        description: 'Create a new todo item',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the todo'
            },
            description: {
              type: 'string',
              description: 'Optional description'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Priority level'
            }
          },
          required: ['title']
        }
      },
      {
        name: 'todo_list',
        description: 'List all todo items',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['all', 'pending', 'completed'],
              description: 'Filter by status'
            }
          }
        }
      },
      {
        name: 'todo_update',
        description: 'Update an existing todo',
        inputSchema: {
          type: 'object',
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
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'New status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'New priority'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'todo_delete',
        description: 'Delete a todo item',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID to delete'
            }
          },
          required: ['id']
        }
      }
    ]
  };
}

/**
 * Handle tools/call request
 */
async function handleToolCall(params) {
  const { name, arguments: args } = params;
  console.log('[SW-MCP] Calling tool:', name, 'with args:', args);

  // In Phase 2, we'll connect this to actual SQLite operations
  // For now, return placeholder responses

  switch (name) {
    case 'todo_create':
      return {
        content: [{
          type: 'text',
          text: `Created todo: ${args.title} (placeholder - SQLite integration in Phase 2)`
        }]
      };

    case 'todo_list':
      return {
        content: [{
          type: 'text',
          text: 'Todo list (placeholder - SQLite integration in Phase 2):\n- No todos yet'
        }]
      };

    case 'todo_update':
      return {
        content: [{
          type: 'text',
          text: `Updated todo ${args.id} (placeholder - SQLite integration in Phase 2)`
        }]
      };

    case 'todo_delete':
      return {
        content: [{
          type: 'text',
          text: `Deleted todo ${args.id} (placeholder - SQLite integration in Phase 2)`
        }]
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Create a JSON-RPC success response
 */
function createSuccessResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Create a JSON-RPC error response
 */
function createErrorResponse(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200, // JSON-RPC errors still return 200
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Service Worker update handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW-MCP] Received skip waiting message');
    self.skipWaiting();
  }
});