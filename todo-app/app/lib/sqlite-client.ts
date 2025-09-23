/**
 * Client-side SQLite database manager using sql.js
 *
 * This module provides a SQLite database that runs entirely in the browser
 * using WebAssembly. Data is persisted to IndexedDB for durability.
 */

import type { SqlJsStatic, Database } from 'sql.js';

// Database instance singleton
let sqliteDb: Database | null = null;
let SQL: SqlJsStatic | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

const DB_NAME = 'todo-manager-db';
const DB_VERSION = 1;

/**
 * Initialize sql.js and load the database
 */
export async function initializeDatabase(): Promise<Database> {
  if (sqliteDb) {
    return sqliteDb;
  }

  console.log('[SQLite] Initializing sql.js...');

  // Initialize sql.js with WASM (dynamic import to avoid SSR issues)
  if (!SQL) {
    const initSqlJs = (await import('sql.js')).default;
    const sqlModule = await initSqlJs({
      locateFile: file => `/sql-wasm.wasm`
    });
    SQL = sqlModule.Database;
  }

  // Try to load existing database from IndexedDB
  const dbData = await loadFromIndexedDB();

  if (dbData) {
    console.log('[SQLite] Loading existing database from IndexedDB');
    sqliteDb = new SQL(new Uint8Array(dbData));
  } else {
    console.log('[SQLite] Creating new database');
    sqliteDb = new SQL();

    // Create initial schema
    await createSchema(sqliteDb);
  }

  // Set up auto-save
  setupAutoSave();

  return sqliteDb;
}

/**
 * Create the initial database schema
 */
async function createSchema(db: Database) {
  console.log('[SQLite] Creating database schema...');

  // Create todos table matching the server schema
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

  // Create index for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)`);

  console.log('[SQLite] Schema created successfully');
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<Database> {
  if (!sqliteDb) {
    return initializeDatabase();
  }
  return sqliteDb;
}

/**
 * Execute a SQL query
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getDatabase();

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();

    // Trigger save after write operations
    if (sql.trim().toUpperCase().startsWith('INSERT') ||
        sql.trim().toUpperCase().startsWith('UPDATE') ||
        sql.trim().toUpperCase().startsWith('DELETE')) {
      scheduleSave();
    }

    return results;
  } catch (error) {
    console.error('[SQLite] Query error:', error, 'SQL:', sql);
    throw error;
  }
}

/**
 * Execute a SQL statement (no results expected)
 */
export async function executeStatement(sql: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();

  try {
    db.run(sql, params);
    scheduleSave();
  } catch (error) {
    console.error('[SQLite] Statement error:', error, 'SQL:', sql);
    throw error;
  }
}

/**
 * Save database to IndexedDB
 */
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');

      store.put(data, 'main');

      transaction.oncomplete = () => {
        console.log('[SQLite] Database saved to IndexedDB');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };
  });
}

/**
 * Load database from IndexedDB
 */
async function loadFromIndexedDB(): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');

      const getRequest = store.get('main');

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };

      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

/**
 * Schedule a save operation (debounced)
 */
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveDatabase();
  }, 1000); // Save 1 second after last change
}

/**
 * Save the current database state
 */
export async function saveDatabase(): Promise<void> {
  if (!sqliteDb) return;

  try {
    const data = sqliteDb.export();
    await saveToIndexedDB(data);
  } catch (error) {
    console.error('[SQLite] Failed to save database:', error);
  }
}

/**
 * Set up auto-save on page unload
 */
function setupAutoSave() {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (sqliteDb) {
        const data = sqliteDb.export();
        // Try synchronous save on unload
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['database'], 'readwrite');
          const store = transaction.objectStore('database');
          store.put(data, 'main');
        };
      }
    });
  }
}

/**
 * Export the database as a file
 */
export async function exportDatabase(): Promise<Blob> {
  const db = await getDatabase();
  const data = db.export();
  return new Blob([data as any], { type: 'application/x-sqlite3' });
}

/**
 * Import a database from a file
 */
export async function importDatabase(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();

  if (!SQL) {
    const initSqlJs = (await import('sql.js')).default;
    const sqlModule = await initSqlJs({
      locateFile: file => `/sql-wasm.wasm`
    });
    SQL = sqlModule.Database;
  }

  // Close existing database
  if (sqliteDb) {
    sqliteDb.close();
  }

  // Load new database
  sqliteDb = new SQL(new Uint8Array(buffer));

  // Save to IndexedDB
  await saveDatabase();

  console.log('[SQLite] Database imported successfully');
}

/**
 * Clear all data (for demo reset)
 */
export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();

  // Drop and recreate tables
  db.run('DROP TABLE IF EXISTS todos');
  await createSchema(db);

  // Save empty database
  await saveDatabase();

  console.log('[SQLite] Database cleared');
}