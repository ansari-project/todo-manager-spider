/**
 * Service Worker MCP Implementation with IndexedDB
 *
 * This Service Worker acts as a local MCP (Model Context Protocol) server,
 * intercepting requests to /api/mcp/* and handling them locally using IndexedDB.
 */

// IndexedDB configuration - MUST match storage-client.ts
const DB_NAME = 'todo-manager';
const DB_VERSION = 2;
const STORE_NAME = 'todos';

/**
 * Open IndexedDB connection
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create todos store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create indexes matching storage-client.ts
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('dueDate', 'dueDate', { unique: false });
      }
    };
  });
}

// Version bump to force update
const SW_VERSION = 'v2.0.1';

// Service Worker lifecycle events
self.addEventListener('install', (event) => {
  console.log(`[SW-MCP] Installing Service Worker ${SW_VERSION}...`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW-MCP] Activating Service Worker ${SW_VERSION}...`);
  event.waitUntil(clients.claim());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Log all requests in debug mode
  if (url.pathname.includes('mcp')) {
    console.log(`[SW-MCP ${SW_VERSION}] Fetch event:`, {
      pathname: url.pathname,
      method: event.request.method,
      url: event.request.url
    });
  }

  // Only intercept MCP protocol requests
  if (url.pathname.startsWith('/api/mcp/')) {
    console.log(`[SW-MCP ${SW_VERSION}] Intercepting MCP request:`, url.pathname);
    event.respondWith(handleMCPRequest(event.request));
  }
});

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request) {
  try {
    const body = await request.json();
    console.log('[SW-MCP] MCP Request:', body);

    const { jsonrpc, method, params, id } = body;

    // Validate JSON-RPC format
    if (jsonrpc !== '2.0') {
      return createErrorResponse(id, -32600, 'Invalid Request: JSON-RPC version must be 2.0');
    }

    // Route to appropriate handler
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
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'Filter by status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Filter by priority'
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
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
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

  switch (name) {
    case 'todo_create':
      return await createTodo(args);

    case 'todo_list':
      return await listTodos(args);

    case 'todo_update':
      return await updateTodo(args);

    case 'todo_delete':
      return await deleteTodo(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Create a new todo
 */
async function createTodo(args) {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const todo = {
    id: crypto.randomUUID(),
    title: args.title,
    description: args.description || null,
    priority: args.priority || 'medium',
    status: 'pending',
    createdAt: new Date().toISOString(), // Store as ISO string for compatibility
    updatedAt: new Date().toISOString(),
    completedAt: null,
    dueDate: args.dueDate || null
  };

  await new Promise((resolve, reject) => {
    const request = store.add(todo);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });

  return {
    content: [{
      type: 'text',
      text: `✅ Created todo: "${todo.title}" [${todo.priority.toUpperCase()} priority]`
    }],
    todo
  };
}

/**
 * List todos with optional filtering
 */
async function listTodos(args) {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  const todos = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Apply filters
  let filtered = todos;
  if (args?.status) {
    filtered = filtered.filter(todo => todo.status === args.status);
  }
  if (args?.priority) {
    filtered = filtered.filter(todo => todo.priority === args.priority);
  }

  // Sort by createdAt descending (newest first)
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Format response without showing IDs
  const statusIcon = {
    pending: '⭕',
    in_progress: '🔄',
    completed: '✅',
    cancelled: '❌'
  };

  // Group by status
  const grouped = {
    pending: filtered.filter(t => t.status === 'pending'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    completed: filtered.filter(t => t.status === 'completed'),
    cancelled: filtered.filter(t => t.status === 'cancelled')
  };

  const pending = grouped.pending.length;
  const inProgress = grouped.in_progress.length;
  const completed = grouped.completed.length;

  let text = `Found ${filtered.length} todo${filtered.length !== 1 ? 's' : ''}`;

  // Add summary
  if (filtered.length > 0) {
    const summary = [];
    if (pending > 0) summary.push(`${pending} pending`);
    if (inProgress > 0) summary.push(`${inProgress} in progress`);
    if (completed > 0) summary.push(`${completed} completed`);
    text += ` (${summary.join(', ')})`;
  }

  if (filtered.length > 0) {
    text += ':\n\n';

    // Show todos grouped by status
    for (const [status, todos] of Object.entries(grouped)) {
      if (todos.length > 0) {
        const label = status === 'in_progress' ? 'In Progress' :
                     status.charAt(0).toUpperCase() + status.slice(1);
        text += `${statusIcon[status]} ${label}:\n`;
        todos.forEach(todo => {
          text += `  • "${todo.title}"`;
          if (todo.priority !== 'medium') {
            text += ` [${todo.priority.toUpperCase()} priority]`;
          }
          if (todo.description) {
            text += `\n    ${todo.description}`;
          }
          text += '\n';
        });
        text += '\n';
      }
    }
  }

  return {
    content: [{
      type: 'text',
      text
    }],
    todos: filtered
  };
}

/**
 * Update a todo
 */
async function updateTodo(args) {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  // Get existing todo
  const existing = await new Promise((resolve, reject) => {
    const request = store.get(args.id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!existing) {
    throw new Error(`Todo with ID ${args.id} not found`);
  }

  // Update fields
  const updated = {
    ...existing,
    ...args,
    id: existing.id, // Preserve ID
    updatedAt: new Date().toISOString()
  };

  // Handle status changes
  if (args.status === 'completed' && existing.status !== 'completed') {
    updated.completedAt = new Date().toISOString();
  } else if (args.status !== 'completed' && existing.status === 'completed') {
    updated.completedAt = null;
  }

  // Save updated todo
  await new Promise((resolve, reject) => {
    const request = store.put(updated);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });

  // Format update message
  let updateMsg = `✅ Updated todo "${updated.title}"`;
  const changes = [];

  if (args.status && args.status !== existing.status) {
    changes.push(`status: ${existing.status} → ${args.status}`);
  }
  if (args.priority && args.priority !== existing.priority) {
    changes.push(`priority: ${existing.priority} → ${args.priority}`);
  }
  if (args.title && args.title !== existing.title) {
    changes.push(`title changed`);
  }

  if (changes.length > 0) {
    updateMsg += ` (${changes.join(', ')})`;
  }

  if (args.status === 'completed') {
    updateMsg += ' - Marked as completed!';
  }

  return {
    content: [{
      type: 'text',
      text: updateMsg
    }],
    todo: updated
  };
}

/**
 * Delete a todo
 */
async function deleteTodo(args) {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  // Get existing todo for confirmation
  const existing = await new Promise((resolve, reject) => {
    const request = store.get(args.id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!existing) {
    throw new Error(`Todo with ID ${args.id} not found`);
  }

  // Delete the todo
  await new Promise((resolve, reject) => {
    const request = store.delete(args.id);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });

  return {
    content: [{
      type: 'text',
      text: `🗑️ Deleted todo "${existing.title}"`
    }],
    success: true
  };
}

/**
 * Create a successful JSON-RPC response
 */
function createSuccessResponse(id, result) {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Create an error JSON-RPC response
 */
function createErrorResponse(id, code, message) {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}