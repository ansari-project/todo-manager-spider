# Specification: Todo Manager Application

## Overview
A modern web-based Todo Manager application with both traditional UI and conversational interface, built using Next.js 14+ with database storage via Drizzle ORM.

## Core Requirements

### Technical Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **UI Components**: React with TypeScript
- **Storage**: Database via Drizzle ORM (SQLite/PostgreSQL)
- **API**: Next.js API routes for backend operations
- **Conversational Interface**: Natural language processing for CRUD operations

### Data Model
```typescript
// SQLite Schema (db/schema.sqlite.ts)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const todos = sqliteTable('todos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title', { length: 200 }).notNull(),
  description: text('description', { length: 1000 }),
  priority: text('priority').notNull().default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().$onUpdate(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => ({
  statusIdx: index('idx_status').on(table.status),
  priorityIdx: index('idx_priority').on(table.priority),
  dueDateIdx: index('idx_due_date').on(table.dueDate),
  createdAtIdx: index('idx_created_at').on(table.createdAt)
}));

// PostgreSQL Schema (db/schema.postgres.ts)
import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const statusEnum = pgEnum('status', ['pending', 'completed']);
export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  priority: priorityEnum('priority').notNull().default('medium'),
  status: statusEnum('status').notNull().default('pending'),
  dueDate: timestamp('due_date', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().$onUpdate(() => new Date()),
  completedAt: timestamp('completed_at', { withTimezone: false })
}, (table) => ({
  statusIdx: index('idx_status').on(table.status),
  priorityIdx: index('idx_priority').on(table.priority),
  dueDateIdx: index('idx_due_date').on(table.dueDate),
  createdAtIdx: index('idx_created_at').on(table.createdAt)
}));

// Unified type exports (works with either schema)
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// SQLite CHECK constraints (add in migration)
// ALTER TABLE todos ADD CONSTRAINT chk_priority CHECK (priority IN ('low','medium','high'));
// ALTER TABLE todos ADD CONSTRAINT chk_status CHECK (status IN ('pending','completed'));
```

### Functional Requirements

#### 1. Todo CRUD Operations
- **Create**: Add new todos with title, optional description, priority, and due date
- **Read**: List all todos with filtering and sorting capabilities
- **Update**: Modify any todo field
- **Delete**: Remove todos with confirmation
- **Complete/Uncomplete**: Toggle todo status

#### 2. User Interfaces

##### Traditional UI
- Checkbox list view with inline editing
- Priority indicators (visual color coding)
- Due date display with overdue highlighting
- Quick actions (complete, edit, delete)
- Sorting by priority, due date, status, creation date
- Filtering by status, priority, date range

##### Conversational Interface
- **LLM-powered** natural language interface using Claude Sonnet
- CRUD operations exposed as tools to the LLM
- Flexible command interpretation (not rigid patterns)
- Examples:
  - "Add a high priority task to review the quarterly report by Friday"
  - "Show me all pending high priority tasks"
  - "Mark the report review as completed"
  - "Add emoji to my todos"
  - "Make all my tasks sound more fun"
- Context-aware responses
- Confirmation for destructive operations

### Non-Functional Requirements

#### Performance
- Fast database queries with indexes
- Connection pooling for concurrent requests
- No file locking issues

#### Storage
- **Database**: Drizzle ORM with dual support:
  - **Local Development**: SQLite (`todos.db`)
  - **Production**: PostgreSQL (via DATABASE_URL)
- **Connection Strategy**:
  - **Node Runtime**: pg Pool with connection reuse
  - **Edge/Serverless**: Neon HTTP driver (@neondatabase/serverless)
- **Migration Strategy**: Separate migration sets per dialect
  - SQLite: `drizzle/sqlite/` directory
  - PostgreSQL: `drizzle/postgres/` directory
- **Type-safe queries**: Full TypeScript integration
- **Maximum**: ~10,000 todos

#### User Experience
- Responsive design (mobile, tablet, desktop)
- Clean, simple UI
- **State Management**: Zustand for React state management

### API Endpoints
```
POST   /api/todos          - Create new todo (with Zod validation)
GET    /api/todos          - List todos (with query filters)
GET    /api/todos/:id      - Get single todo
PUT    /api/todos/:id      - Update todo (with validation)
DELETE /api/todos/:id      - Delete todo
POST   /api/todos/:id/toggle - Toggle completion status

POST   /api/conversation   - Process natural language command (rate limited: 10/min)
```

#### Input Validation
- **Zod schemas** for all request payloads
- Title: required, 1-200 chars
- Description: optional, max 1000 chars
- Priority: enum ['low', 'medium', 'high']
- DueDate: ISO 8601 string → Date conversion (stored as UTC)
- Server-generated: id (UUID), createdAt, updatedAt timestamps
- **Environment validation** on startup:
  ```typescript
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']),
    DATABASE_URL: z.string().optional(),
    ANTHROPIC_API_KEY: z.string()
  });
  ```

### Conversational Interface

#### LLM Integration via MCP
- **MCP Server** exposes CRUD operations as tools to Claude
- **Tool Schemas** with explicit input validation:
  - `create_todo`: title (required), description, priority, dueDate
  - `list_todos`: filter by status/priority/date
  - `update_todo`: id + fields to update
  - `delete_todo`: id with confirmation required
  - `bulk_update_preview`: preview changes before applying
  - `apply_bulk_update`: requires explicit confirmation
- **Confirmation Flow**: Preview → Confirm → Apply for destructive/bulk operations
- **Error Handling**: Timeouts (15s), retries with backoff, fallback to manual UI
- **Security**: ANTHROPIC_API_KEY via environment variables, server-only calls

## User Stories

1. **As a user**, I want to quickly add todos using natural language so I don't have to fill out forms
2. **As a user**, I want to see all my todos in a traditional list view for quick overview
3. **As a user**, I want to prioritize my todos to focus on what's important
4. **As a user**, I want to set due dates to manage deadlines
5. **As a user**, I want to use conversational commands to manage todos hands-free
6. **As a user**, I want my todos to persist between sessions
7. **As a user**, I want to filter and sort todos to find what I need quickly

## Acceptance Criteria

### Must Have
- [ ] All CRUD operations work via both UI and conversational interface
- [ ] Todos persist to database (SQLite in dev, PostgreSQL in prod)
- [ ] Priority levels with visual indicators
- [ ] Due date support with overdue highlighting
- [ ] Status toggling (pending/completed)
- [ ] LLM-powered conversational interface using Claude
- [ ] Responsive design for all screen sizes
- [ ] Error handling with user-friendly messages


## Out of Scope
- User authentication/multi-user support
- Cloud synchronization (beyond database)
- Mobile native apps
- Email/calendar integration
- Attachments/file uploads
- Collaboration features
- NoSQL databases (MongoDB, etc.)

## Technical Constraints
- Must use Next.js 14+ with App Router
- Must use TypeScript for type safety
- Must use Drizzle ORM for database abstraction
- Minimal external API dependencies
- **Deployment Flexibility**:
  - **Local/VPS**: SQLite (simple, no setup)
  - **Serverless (Vercel/Netlify)**: PostgreSQL via connection string
  - **Docker**: Either SQLite or PostgreSQL

## Success Metrics
- All CRUD operations functional in both interfaces
- Natural language interface works smoothly with Claude
- Data persists correctly to database
- Clean, usable UI
- Seamless switching between SQLite and PostgreSQL

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database connection issues | Medium | Proper error handling, connection retries |
| Schema migration conflicts | Low | Drizzle Kit handles migrations safely |
| LLM API failures | Medium | Fallback to manual input |

## Dependencies
- Next.js 14+
- React 18+
- TypeScript 5+
- Node.js 18+
- **Drizzle ORM** (database abstraction)
- **Drizzle Kit** (migrations and schema management)
- **better-sqlite3** (for local SQLite)
- **@neondatabase/serverless** or **pg** (for PostgreSQL)
- zod (for input validation)
- date-fns (for date parsing)
- Zustand (for state management)
- @modelcontextprotocol/sdk (for MCP server)
- Anthropic SDK (for Claude integration)

## UI Framework
- **shadcn/ui** - Beautiful, accessible components built on Radix UI + Tailwind CSS
- Component-based approach with full customization control
- Includes form components, dialogs, and other UI primitives needed for the app

## Testing Strategy
- **Unit Tests**: Basic tests for core functionality
- **Integration Tests**: API endpoint testing
- **Manual Testing**: UI and conversational interface testing

