# Drizzle ORM Implementation Guide

## Overview

This guide explains how Drizzle ORM is used in the Todo Manager project to provide database abstraction, type safety, and support for multiple database backends.

## Why Drizzle ORM?

### Initial Challenge
The project initially specified flat file storage (JSON), but during planning we identified critical issues:
- **File locking**: Concurrent access problems
- **Query limitations**: No efficient filtering or sorting
- **Scalability**: Loading entire file for every operation
- **Deployment constraints**: Serverless platforms don't support file writes

### Why Not Direct SQL?
- No type safety
- SQL injection risks
- Database-specific syntax
- Manual schema management
- No migration support

### Why Drizzle Over Other ORMs?

**vs Prisma:**
- Drizzle is lighter weight (no separate CLI/generator step)
- Direct TypeScript schema definition (no separate schema language)
- Better serverless performance (no connection pooling issues)
- Simpler deployment (no binary dependencies)

**vs TypeORM:**
- More modern TypeScript-first API
- Better type inference
- Simpler configuration
- Less "magic" - more explicit

**vs Kysely:**
- Higher-level abstraction
- Built-in migration support
- Richer schema definition

## Architecture in This Project

### 1. Schema Definition (`db/schema.ts`)

```typescript
// SQLite Schema (Development)
export const todos = sqliteTable('todos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title', { length: 200 }).notNull(),
  description: text('description', { length: 1000 }),
  priority: text('priority', {
    enum: ['low', 'medium', 'high']
  }).notNull().default('medium'),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'cancelled']
  }).notNull().default('pending'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => {
  return {
    statusIdx: index('status_idx').on(table.status),
    priorityIdx: index('priority_idx').on(table.priority),
    dueDateIdx: index('due_date_idx').on(table.dueDate),
  }
})
```

**Key Features:**
- Type-safe schema definition
- Automatic UUID generation
- Enum constraints
- Automatic timestamps
- Performance indexes

### 2. Database Connection (`db/client.ts`)

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

const sqlite = new Database('todos.db')
export const db = drizzle(sqlite, { schema })
```

**Dual Database Strategy:**
- SQLite for local development (zero configuration)
- PostgreSQL ready for production (connection string swap)

### 3. Type Inference

Drizzle automatically infers types from the schema:

```typescript
// Automatic type generation
type Todo = typeof todos.$inferSelect
type NewTodo = typeof todos.$inferInsert

// Results in:
type Todo = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}
```

### 4. Query Patterns

**Basic CRUD:**

```typescript
// CREATE
const [newTodo] = await db.insert(todos)
  .values({
    title: 'Buy groceries',
    priority: 'high'
  })
  .returning()

// READ with filtering
const pendingTodos = await db.select()
  .from(todos)
  .where(eq(todos.status, 'pending'))
  .orderBy(desc(todos.priority))

// UPDATE
const [updated] = await db.update(todos)
  .set({ status: 'completed', completedAt: new Date() })
  .where(eq(todos.id, todoId))
  .returning()

// DELETE
const [deleted] = await db.delete(todos)
  .where(eq(todos.id, todoId))
  .returning()
```

**Complex Queries:**

```typescript
// Search with multiple conditions
const results = await db.select()
  .from(todos)
  .where(
    and(
      eq(todos.status, status),
      eq(todos.priority, priority),
      or(
        like(todos.title, `%${search}%`),
        like(todos.description, `%${search}%`)
      )
    )
  )
  .orderBy(desc(todos.dueDate))
```

### 5. Migration Strategy

```typescript
// drizzle.config.ts
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './todos.db',
  },
}

// Generate migrations
// npm run db:generate

// Apply migrations
// npm run db:push
```

## Benefits Realized

### 1. Type Safety
- Compile-time query validation
- Auto-completion in IDE
- Refactoring safety

### 2. Database Agnostic
```typescript
// Easy switch between databases
const db = process.env.DATABASE_URL
  ? drizzle(postgres(process.env.DATABASE_URL))
  : drizzle(sqlite)
```

### 3. Performance
- Prepared statements by default
- Efficient indexing
- No N+1 query problems

### 4. Developer Experience
- No code generation step
- Clear, readable queries
- Excellent TypeScript integration

## Common Patterns in This Project

### 1. Optional Filtering
```typescript
const query = db.select().from(todos)
if (status) query.where(eq(todos.status, status))
if (priority) query.where(eq(todos.priority, priority))
const results = await query
```

### 2. Validation Layer
```typescript
// Use Zod for input validation
const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']),
})

// Validate before database operation
const validated = CreateTodoSchema.parse(input)
await db.insert(todos).values(validated)
```

### 3. Error Handling
```typescript
try {
  const result = await db.insert(todos).values(data)
  return { success: true, data: result }
} catch (error) {
  // Drizzle throws typed errors
  if (error.code === 'SQLITE_CONSTRAINT') {
    return { success: false, error: 'Validation failed' }
  }
  throw error
}
```

## Testing Strategy

### 1. In-Memory Database
```typescript
// tests/helpers/db.ts
export function createTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })

  // Run migrations
  migrate(db, { migrationsFolder: './drizzle' })

  return db
}
```

### 2. Test Isolation
```typescript
beforeEach(async () => {
  testDb = createTestDb()
  // Seed test data
})

afterEach(async () => {
  // In-memory DB is automatically cleaned up
})
```

## Production Considerations

### 1. Connection Management
```typescript
// For serverless (PostgreSQL)
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)
```

### 2. Migration in Production
```bash
# Run migrations before deployment
npm run db:migrate

# Or in deployment script
node -r esbuild-register drizzle/migrate.ts
```

### 3. Performance Optimization
- Use indexes for frequently queried columns
- Consider pagination for large datasets
- Use select specific columns when possible

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure schema changes trigger TypeScript recompilation
2. **Migration Conflicts**: Always generate migrations from a clean state
3. **Connection Issues**: Check DATABASE_URL format for production
4. **SQLite vs PostgreSQL Differences**: Test both environments

### Debug Queries
```typescript
// Enable query logging
const db = drizzle(sqlite, {
  logger: true
})
```

## Resources

- [Drizzle Documentation](https://orm.drizzle.team/)
- [SQLite Schema Reference](https://orm.drizzle.team/docs/sql-schema-declaration)
- [PostgreSQL Schema Reference](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Query API Reference](https://orm.drizzle.team/docs/select)
- [Migration Guide](https://orm.drizzle.team/docs/migrations)

## Decision Summary

Drizzle ORM was chosen for this project because:

1. **Type Safety**: Full TypeScript integration without code generation
2. **Flexibility**: Supports both SQLite (development) and PostgreSQL (production)
3. **Simplicity**: Straightforward API without hidden complexity
4. **Performance**: Lightweight and suitable for serverless
5. **Migration Support**: Built-in schema migration tools

This approach gives us the benefits of an ORM (type safety, abstraction) without the downsides (complexity, performance overhead) often associated with traditional ORMs.