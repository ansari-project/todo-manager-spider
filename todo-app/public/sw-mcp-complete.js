/**
 * Complete Service Worker with MCP + SQLite Integration
 * This combines the MCP handlers with SQLite database
 */

// Import sql.js for SQLite
importScripts('/sql-wasm.js');

// Import MCP handlers
importScripts('/sw-mcp-handlers.js');

// Database state
let db = null;
let SQL = null;
let dbInitPromise = null;

const DB_NAME = 'sw-todo-manager-db';
const DB_VERSION = 1;

/**
 * Initialize SQLite database
 */
async function initializeSQLite() {
  if (db) return db;

  console.log('[SW-MCP] Initializing SQLite...');

  // Initialize sql.js
  SQL = await initSqlJs({
    locateFile: file => `/sql-wasm.wasm`
  });

  // Try to load existing database from IndexedDB
  const dbData = await loadFromIndexedDB();

  if (dbData) {
    console.log('[SW-MCP] Loading existing database from IndexedDB');
    db = new SQL.Database(new Uint8Array(dbData));
  } else {
    console.log('[SW-MCP] Creating new database');
    db = new SQL.Database();
    await createSchema();
  }

  return db;
}

/**
 * Ensure database is initialized (singleton pattern)
 */
function getDb() {
  if (!dbInitPromise) {
    dbInitPromise = initializeSQLite();
  }
  return dbInitPromise;
}

/**
 * Create database schema
 */
async function createSchema() {
  db.run(`
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

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)`);
}

/**
 * Load database from IndexedDB
 */
async function loadFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

/**
 * Save database to IndexedDB (attached to self for testability)
 */
self.saveDatabase = async function() {
  if (!db) return;

  const data = db.export();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

      transaction.oncomplete = () => {
        console.log('[SW-MCP] Database saved to IndexedDB');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };
  });
}

/**
 * Override the SQLite execution functions for MCP handlers
 */
self.executeSQLiteQuery = async function(sql, params = []) {
  await getDb();

  const stmt = db.prepare(sql);
  stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }

  stmt.free();
  return results;
};

self.executeSQLiteStatement = async function(sql, params = []) {
  await getDb();
  db.run(sql, params);
};

/**
 * Service Worker lifecycle events
 */
self.addEventListener('install', (event) => {
  console.log('[SW-MCP] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', async (event) => {
  console.log('[SW-MCP] Activating...');
  event.waitUntil(
    (async () => {
      await clients.claim();
      await getDb(); // Initialize database on activation
    })()
  );
});

/**
 * Fetch handler for MCP requests
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle MCP protocol requests
  if (url.pathname.startsWith('/api/mcp/')) {
    event.respondWith(handleMCPRequest(event.request));
  }
});

/**
 * Create JSON-RPC response
 */
function createResponse(result, id) {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      result,
      id
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create JSON-RPC error response
 */
function createErrorResponse(id, code, message) {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code, message },
      id
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request) {
  try {
    // Validate request method and content type
    if (request.method !== 'POST') {
      return createErrorResponse(null, -32600, 'Invalid Request: POST required');
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return createErrorResponse(null, -32600, 'Invalid Request: application/json required');
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(null, -32700, 'Parse error');
    }

    const { jsonrpc, method, params, id } = body;

    // Validate JSON-RPC version
    if (jsonrpc !== '2.0') {
      return createErrorResponse(id ?? null, -32600, 'Invalid Request');
    }

    // Ensure database is initialized
    await getDb();

    // Route to appropriate handler
    let result;
    switch (method) {
      case 'tools/list':
        result = Object.keys(MCP_TOOLS).map(name => ({
          name,
          ...MCP_TOOLS[name]
        }));
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        result = await handleToolCall(name, args);

        // Save database after write operations
        if (['todo.create', 'todo.update', 'todo.delete', 'todo.complete'].includes(name)) {
          await self.saveDatabase();
        }
        break;

      default:
        return createErrorResponse(id, -32601, `Method not found: ${method}`);
    }

    return createResponse(result, id);

  } catch (error) {
    console.error('[SW-MCP] Error:', error);
    return createErrorResponse(
      null,
      -32603,
      error instanceof Error ? error.message : 'Internal error'
    );
  }
}

console.log('[SW-MCP] Service Worker with complete MCP + SQLite integration loaded');