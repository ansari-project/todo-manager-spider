/**
 * Service Worker MCP Implementation with SQLite
 *
 * This Service Worker acts as a local MCP server with SQLite database support.
 * It intercepts MCP requests and executes them against a client-side SQLite database.
 */

// Import sql.js for SQLite support
importScripts('/sql-wasm.js');

// Database instance
let db = null;
let SQL = null;

// Initialize SQLite when Service Worker activates
async function initializeSQLite() {
  if (db) return db;

  try {
    console.log('[SW-MCP-SQLite] Initializing SQLite...');

    // Initialize SQL.js
    SQL = await initSqlJs({
      locateFile: file => `/sql-wasm.wasm`
    });

    // Try to load existing database from IndexedDB
    const dbData = await loadFromIndexedDB();

    if (dbData) {
      console.log('[SW-MCP-SQLite] Loading existing database');
      db = new SQL.Database(new Uint8Array(dbData));
    } else {
      console.log('[SW-MCP-SQLite] Creating new database');
      db = new SQL.Database();
      await createSchema(db);
    }

    return db;
  } catch (error) {
    console.error('[SW-MCP-SQLite] Failed to initialize:', error);
    throw error;
  }
}

// Create database schema
function createSchema(database) {
  console.log('[SW-MCP-SQLite] Creating schema...');

  database.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)`);
}

// Load database from IndexedDB
async function loadFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('todo-manager-db', 1);

    request.onerror = () => resolve(null);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const getRequest = store.get('main');

      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => resolve(null);
    };
  });
}

// Save database to IndexedDB
async function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('todo-manager-db', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      store.put(data, 'main');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Service Worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[SW-MCP-SQLite] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
  console.log('[SW-MCP-SQLite] Activating...');
  event.waitUntil(
    (async () => {
      await clients.claim();
      await initializeSQLite();
    })()
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/mcp/')) {
    console.log('[SW-MCP-SQLite] Intercepting:', url.pathname);
    event.respondWith(handleMCPRequest(event.request));
  }
});

// Handle MCP requests
async function handleMCPRequest(request) {
  try {
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== '2.0') {
      return createErrorResponse(id, -32600, 'Invalid Request');
    }

    // Ensure database is initialized
    if (!db) {
      await initializeSQLite();
    }

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
    console.error('[SW-MCP-SQLite] Error:', error);
    return createErrorResponse(null, -32603, error.message);
  }
}

// Handle initialize
async function handleInitialize(params) {
  return {
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'todo-manager-sw-mcp-sqlite',
      version: '1.0.0'
    },
    capabilities: {
      tools: {}
    }
  };
}

// Handle tools/list
async function handleToolsList(params) {
  return {
    tools: [
      {
        name: 'todo_create',
        description: 'Create a new todo item',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['title']
        }
      },
      {
        name: 'todo_list',
        description: 'List all todos',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['all', 'pending', 'in_progress', 'completed'] }
          }
        }
      },
      {
        name: 'todo_update',
        description: 'Update a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['id']
        }
      },
      {
        name: 'todo_delete',
        description: 'Delete a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      },
      {
        name: 'todo_search',
        description: 'Search todos',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      }
    ]
  };
}

// Handle tools/call
async function handleToolCall(params) {
  const { name, arguments: args } = params;
  console.log('[SW-MCP-SQLite] Tool call:', name, args);

  try {
    let result;

    switch (name) {
      case 'todo_create':
        result = await createTodo(args);
        break;
      case 'todo_list':
        result = await listTodos(args);
        break;
      case 'todo_update':
        result = await updateTodo(args);
        break;
      case 'todo_delete':
        result = await deleteTodo(args);
        break;
      case 'todo_search':
        result = await searchTodos(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Save database after modifications
    if (['todo_create', 'todo_update', 'todo_delete'].includes(name)) {
      await saveDatabase();
    }

    return {
      content: [{
        type: 'text',
        text: result
      }]
    };

  } catch (error) {
    console.error('[SW-MCP-SQLite] Tool error:', error);
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }
}

// Todo operations
async function createTodo(args) {
  const id = generateUUID();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO todos (id, title, description, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, args.title, args.description || null, args.priority || 'medium', now, now]
  );

  return `Created todo: ${args.title} (ID: ${id})`;
}

async function listTodos(args) {
  let sql = 'SELECT * FROM todos';
  const params = [];

  if (args.status && args.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(args.status);
  }

  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  stmt.bind(params);

  const todos = [];
  while (stmt.step()) {
    todos.push(stmt.getAsObject());
  }
  stmt.free();

  if (todos.length === 0) {
    return 'No todos found';
  }

  const statusEmoji = {
    'pending': '⏳',
    'in_progress': '🔄',
    'completed': '✅'
  };

  return todos.map(todo =>
    `${statusEmoji[todo.status]} [${todo.priority}] ${todo.title} (ID: ${todo.id})`
  ).join('\n');
}

async function updateTodo(args) {
  const updates = [];
  const params = [];

  if (args.title !== undefined) {
    updates.push('title = ?');
    params.push(args.title);
  }
  if (args.description !== undefined) {
    updates.push('description = ?');
    params.push(args.description);
  }
  if (args.status !== undefined) {
    updates.push('status = ?');
    params.push(args.status);
  }
  if (args.priority !== undefined) {
    updates.push('priority = ?');
    params.push(args.priority);
  }

  if (updates.length === 0) {
    return 'No updates provided';
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(args.id);

  db.run(
    `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return `Updated todo ${args.id}`;
}

async function deleteTodo(args) {
  db.run('DELETE FROM todos WHERE id = ?', [args.id]);
  return `Deleted todo ${args.id}`;
}

async function searchTodos(args) {
  const searchTerm = `%${args.query}%`;

  const stmt = db.prepare(
    `SELECT * FROM todos
     WHERE title LIKE ? OR description LIKE ?
     ORDER BY created_at DESC`
  );
  stmt.bind([searchTerm, searchTerm]);

  const todos = [];
  while (stmt.step()) {
    todos.push(stmt.getAsObject());
  }
  stmt.free();

  if (todos.length === 0) {
    return `No todos found matching "${args.query}"`;
  }

  return todos.map(todo =>
    `[${todo.status}] ${todo.title} - ${todo.description || 'No description'}`
  ).join('\n');
}

// Save database
async function saveDatabase() {
  if (!db) return;

  try {
    const data = db.export();
    await saveToIndexedDB(data);
    console.log('[SW-MCP-SQLite] Database saved');
  } catch (error) {
    console.error('[SW-MCP-SQLite] Save failed:', error);
  }
}

// Response helpers
function createSuccessResponse(id, result) {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createErrorResponse(id, code, message) {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});