import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { todos } from '@/db/schema'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('Database Schema', () => {
  let db: ReturnType<typeof drizzle>
  let sqlite: Database.Database

  beforeEach(() => {
    // Use in-memory database for tests
    sqlite = new Database(':memory:')
    db = drizzle(sqlite, { schema })

    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium' NOT NULL,
        due_date INTEGER,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        completed_at INTEGER
      )
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should create a todo with defaults', async () => {
    const result = await db.insert(todos).values({
      id: 'test-id',
      title: 'Test Todo',
    }).returning()

    expect(result[0]).toMatchObject({
      id: 'test-id',
      title: 'Test Todo',
      priority: 'medium',
      status: 'pending',
      description: null,
      dueDate: null,
      completedAt: null,
    })
    expect(result[0].createdAt).toBeDefined()
    expect(result[0].updatedAt).toBeDefined()
  })

  it('should update a todo', async () => {
    await db.insert(todos).values({
      id: 'test-id',
      title: 'Original Title',
    })

    const result = await db
      .update(todos)
      .set({ title: 'Updated Title' })
      .where(eq(todos.id, 'test-id'))
      .returning()

    expect(result[0].title).toBe('Updated Title')
  })

  it('should delete a todo', async () => {
    await db.insert(todos).values({
      id: 'test-id',
      title: 'To Delete',
    })

    const deleteResult = await db
      .delete(todos)
      .where(eq(todos.id, 'test-id'))
      .returning()

    expect(deleteResult[0].id).toBe('test-id')

    const remaining = await db.select().from(todos)
    expect(remaining).toHaveLength(0)
  })

  it('should handle all priority levels', async () => {
    const priorities = ['low', 'medium', 'high'] as const

    for (const priority of priorities) {
      const result = await db.insert(todos).values({
        id: `test-${priority}`,
        title: `${priority} priority`,
        priority,
      }).returning()

      expect(result[0].priority).toBe(priority)
    }
  })

  it('should handle all status values', async () => {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const

    for (const status of statuses) {
      const result = await db.insert(todos).values({
        id: `test-${status}`,
        title: `${status} todo`,
        status,
      }).returning()

      expect(result[0].status).toBe(status)
    }
  })
})