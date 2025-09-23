/**
 * IndexedDB storage client for Todo Manager
 * Simple, efficient storage without SQL overhead
 */

import { Todo, NewTodo, UpdateTodo } from '@/db/types';

const DB_NAME = 'todo-manager';
const DB_VERSION = 2;
const STORE_NAME = 'todos';

/**
 * Open IndexedDB connection
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create todos store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient queries
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('dueDate', 'dueDate', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Todo storage operations
 */
export const todos = {
  /**
   * Get all todos
   */
  async findAll(): Promise<Todo[]> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const todos = request.result as Todo[];
        // Sort by createdAt descending
        todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        resolve(todos);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get todo by ID
   */
  async findById(id: string): Promise<Todo | null> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Create new todo
   */
  async create(data: NewTodo): Promise<Todo> {
    const todo: Todo = {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      status: data.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: data.completedAt || null
    };

    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.add(todo);
      request.onsuccess = () => resolve(todo);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Update todo
   */
  async update(id: string, data: UpdateTodo): Promise<Todo | null> {
    const existing = await todos.findById(id);
    if (!existing) {
      return null;
    }

    const updated: Todo = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
      // Set completedAt when status changes to completed
      completedAt: data.status === 'completed' && existing.status !== 'completed'
        ? new Date()
        : data.status !== 'completed' && existing.status === 'completed'
        ? null
        : existing.completedAt
    };

    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete todo
   */
  async delete(id: string): Promise<boolean> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete all todos
   */
  async deleteAll(): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Search todos by text
   */
  async search(query: string): Promise<Todo[]> {
    const allTodos = await todos.findAll();
    const searchTerm = query.toLowerCase();

    return allTodos.filter(todo =>
      todo.title.toLowerCase().includes(searchTerm) ||
      (todo.description && todo.description.toLowerCase().includes(searchTerm))
    );
  },

  /**
   * Get todos by status
   */
  async findByStatus(status: string): Promise<Todo[]> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);
      request.onsuccess = () => {
        const todos = request.result as Todo[];
        todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        resolve(todos);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get todos with filters
   */
  async findWithFilters(filters: {
    status?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Todo[]> {
    let results = await todos.findAll();

    if (filters.status) {
      results = results.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      results = results.filter(t => t.priority === filters.priority);
    }
    if (filters.startDate) {
      results = results.filter(t => t.dueDate && t.dueDate >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(t => t.dueDate && t.dueDate <= filters.endDate!);
    }

    return results;
  }
};

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<Todo[]> {
  return await todos.findAll();
}

/**
 * Import database from backup
 */
export async function importDatabase(data: Todo[]): Promise<void> {
  await todos.deleteAll();

  for (const todo of data) {
    await todos.create(todo);
  }
}

/**
 * Clear all data (for demo reset)
 */
export async function clearDatabase(): Promise<void> {
  await todos.deleteAll();
}