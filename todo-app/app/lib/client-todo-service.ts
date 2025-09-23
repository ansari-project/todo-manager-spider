/**
 * Client-side todo service using SQLite
 *
 * This service provides todo CRUD operations using the browser-based SQLite database.
 * It mirrors the API of the server-side todo service but runs entirely client-side.
 */

import { executeQuery, executeStatement } from './sqlite-client';
import { v4 as uuidv4 } from 'uuid';

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Create a new todo
 */
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await executeStatement(
    `INSERT INTO todos (id, title, description, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.description || null,
      input.priority || 'medium',
      now,
      now
    ]
  );

  const [todo] = await executeQuery(
    'SELECT * FROM todos WHERE id = ?',
    [id]
  );

  return todo as Todo;
}

/**
 * Get all todos
 */
export async function getAllTodos(): Promise<Todo[]> {
  const todos = await executeQuery(
    'SELECT * FROM todos ORDER BY created_at DESC'
  );

  return todos as Todo[];
}

/**
 * Get a single todo by ID
 */
export async function getTodoById(id: string): Promise<Todo | null> {
  const [todo] = await executeQuery(
    'SELECT * FROM todos WHERE id = ?',
    [id]
  );

  return todo as Todo || null;
}

/**
 * Update a todo
 */
export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo | null> {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }

  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }

  if (updates.length === 0) {
    return getTodoById(id);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  await executeStatement(
    `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getTodoById(id);
}

/**
 * Delete a todo
 */
export async function deleteTodo(id: string): Promise<boolean> {
  await executeStatement(
    'DELETE FROM todos WHERE id = ?',
    [id]
  );

  return true;
}

/**
 * Search todos
 */
export async function searchTodos(query: string): Promise<Todo[]> {
  const searchTerm = `%${query}%`;

  const todos = await executeQuery(
    `SELECT * FROM todos
     WHERE title LIKE ? OR description LIKE ?
     ORDER BY created_at DESC`,
    [searchTerm, searchTerm]
  );

  return todos as Todo[];
}

/**
 * Get todos by status
 */
export async function getTodosByStatus(status: 'pending' | 'in_progress' | 'completed'): Promise<Todo[]> {
  const todos = await executeQuery(
    'SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC',
    [status]
  );

  return todos as Todo[];
}

/**
 * Get todo statistics
 */
export async function getTodoStats(): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}> {
  const [stats] = await executeQuery(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM todos
  `);

  return {
    total: stats.total || 0,
    pending: stats.pending || 0,
    in_progress: stats.in_progress || 0,
    completed: stats.completed || 0
  };
}

/**
 * Bulk update todo status
 */
export async function bulkUpdateStatus(
  ids: string[],
  status: 'pending' | 'in_progress' | 'completed'
): Promise<number> {
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => '?').join(', ');
  const params = [...ids, status, new Date().toISOString()];

  await executeStatement(
    `UPDATE todos
     SET status = ?, updated_at = ?
     WHERE id IN (${placeholders})`,
    [status, new Date().toISOString(), ...ids]
  );

  return ids.length;
}

/**
 * Add sample todos (for demo)
 */
export async function addSampleTodos(): Promise<void> {
  const samples = [
    {
      title: 'Welcome to Todo Manager!',
      description: 'This app uses client-side SQLite - all your data stays in your browser',
      priority: 'high' as const
    },
    {
      title: 'Try the conversational interface',
      description: 'Use the chat below to manage todos with natural language',
      priority: 'medium' as const
    },
    {
      title: 'Export your data anytime',
      description: 'You can export and import your todos as a SQLite database file',
      priority: 'low' as const
    }
  ];

  for (const sample of samples) {
    await createTodo(sample);
  }
}