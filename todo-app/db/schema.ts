import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title', { length: 200 }).notNull(),
  description: text('description', { length: 1000 }),
  priority: text('priority', {
    enum: ['low', 'medium', 'high']
  }).notNull().default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'cancelled']
  }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => ({
  statusIdx: index('idx_status').on(table.status),
  priorityIdx: index('idx_priority').on(table.priority),
  dueDateIdx: index('idx_due_date').on(table.dueDate),
  createdAtIdx: index('idx_created_at').on(table.createdAt)
}))

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert