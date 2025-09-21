# Implementation Plan: Todo Manager Application

## Overview
Building a Todo Manager with dual interfaces (traditional UI and LLM-powered conversational interface) using Drizzle ORM for database abstraction and MCP for LLM tool integration.

## Phase 1: Project Setup and Foundation

### 1.1 Initialize Next.js Project
- [ ] Create Next.js 14+ app with TypeScript
- [ ] Configure App Router structure
- [ ] Set up ESLint and Prettier
- [ ] Initialize Git repository

### 1.2 Install Core Dependencies
```bash
# Database dependencies - SQLite only initially
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# Core dependencies (no Zustand - using useState)
npm install zod date-fns @modelcontextprotocol/sdk
npm install @anthropic-ai/sdk express-rate-limit

# UI dependencies (shadcn/ui)
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-slot
npx shadcn-ui@latest init

# Testing dependencies
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @vitejs/plugin-react jsdom

# Dev dependencies
npm install -D @types/node dotenv-cli
```

### 1.3 Project Structure
```
todo-manager/
├── app/
│   ├── api/
│   │   ├── todos/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── conversation/
│   │       └── route.ts
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   ├── TodoForm.tsx
│   │   └── ConversationalInterface.tsx
│   ├── layout.tsx
│   └── page.tsx
├── db/
│   ├── schema.ts            # SQLite schema
│   ├── client.ts            # Database connection
│   └── migrate.ts           # Migration runner
├── drizzle/                 # SQLite migrations
├── lib/
│   ├── mcp/
│   │   ├── server.ts        # MCP server setup
│   │   └── tools.ts         # Tool definitions
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas
│   └── types/
│       └── todo.ts
├── drizzle.config.ts        # SQLite config
├── tests/                   # Test files
│   ├── api/                 # API route tests
│   ├── components/          # Component tests
│   └── setup.ts             # Test setup
└── .env.local               # ANTHROPIC_API_KEY
```

## Phase 2: Database Layer Implementation (SQLite Only)

### 2.1 Database Setup
- [ ] Create SQLite schema with indexes
- [ ] Configure Drizzle config for SQLite
- [ ] Add environment validation with Zod
- [ ] Write tests for schema validation

### 2.2 Database Client
- [ ] Implement SQLite connection logic
- [ ] Create global singleton for database instance
- [ ] Write tests for database connection

### 2.3 Migrations
- [ ] Generate initial migrations for SQLite
- [ ] Add CHECK constraints for SQLite enums
- [ ] Create migration runner script
- [ ] Test rollback procedures
- [ ] Write tests for migration logic

### 2.4 Type Definitions & Validation
- [ ] Export unified Todo types from schema
- [ ] Define Zod schemas for validation:
  - TodoCreateSchema
  - TodoUpdateSchema
  - TodoFilterSchema
  - EnvironmentSchema
- [ ] Add ISO 8601 → Date conversion for timestamps

## Phase 3: API Development

### 3.1 Core CRUD Endpoints
- [ ] POST /api/todos - Create with Zod validation
- [ ] GET /api/todos - List with filtering/sorting using Drizzle queries
- [ ] GET /api/todos/:id - Single todo retrieval
- [ ] PUT /api/todos/:id - Update with validation and auto-updatedAt
- [ ] DELETE /api/todos/:id - Delete with confirmation
- [ ] POST /api/todos/:id/toggle - Status toggling with completedAt

### 3.2 Database Operations
- [ ] Implement type-safe queries with Drizzle
- [ ] Add proper error handling for database operations
- [ ] Use transactions where needed
- [ ] Ensure updatedAt updates on every modification

### 3.3 Conversation Endpoint
- [ ] POST /api/conversation - Rate limited (10 req/min)
- [ ] Integrate with MCP server
- [ ] Error handling for LLM failures
- [ ] Timeout and retry logic

### 3.4 Input Validation
- [ ] Server-generated UUIDs for IDs
- [ ] Server-generated timestamps
- [ ] Title length validation (1-200 chars)
- [ ] Priority enum validation
- [ ] UTC timestamp conversion

## Phase 4: UI Development with shadcn/ui

### 4.1 State Management
- [ ] Use React useState for local component state
- [ ] Implement data fetching with native fetch
- [ ] Server as source of truth
- [ ] Optimistic updates for better UX
- [ ] Write tests for state management

### 4.2 shadcn/ui Components Setup
- [ ] Install and configure shadcn/ui
- [ ] Add required components:
  - Button, Input, Label
  - Dialog, Card
  - Checkbox, Select
  - Toast/Sonner for notifications

### 4.3 Core Components (Split View Layout)
- [ ] Main layout with 2/3 top for todos, 1/3 bottom for chat
- [ ] TodoList with clean layout (upper section)
- [ ] TodoItem with checkbox and actions
- [ ] TodoForm with validation
- [ ] FilterBar (status, priority)
- [ ] Simple sorting controls
- [ ] ConversationalInterface component (lower section)
- [ ] Resizable divider between sections (optional)
- [ ] Write component tests for each

### 4.4 UI Features
- [ ] Split view: todos (top 2/3), chat (bottom 1/3)
- [ ] Priority color coding (low/medium/high)
- [ ] Due date display
- [ ] Overdue highlighting
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Minimum height constraints for both sections
- [ ] Write tests for UI interactions

## Phase 5: MCP Server & LLM Integration

### 5.1 MCP Server Setup
- [ ] Create MCP server with tool definitions:
  - create_todo
  - list_todos
  - update_todo
  - delete_todo
  - bulk_update_preview
  - apply_bulk_update
- [ ] Tool input validation schemas
- [ ] Confirmation flow for destructive operations
- [ ] Preview mechanism for bulk operations

### 5.2 LLM Integration
- [ ] Configure Anthropic SDK with Claude
- [ ] Environment variable setup (ANTHROPIC_API_KEY)
- [ ] Timeout configuration (15s)
- [ ] Retry logic with exponential backoff
- [ ] Error handling and fallback to manual UI
- [ ] Cost controls (max tokens)

### 5.3 Conversational UI
- [ ] Chat-like interface using shadcn/ui components
- [ ] Message history display
- [ ] Input field with send button
- [ ] Loading states during LLM processing
- [ ] Error messages with fallback options
- [ ] Confirmation dialogs for destructive operations

## Phase 6: PostgreSQL Support (Final Step)

### 6.1 PostgreSQL Schema
- [ ] Create PostgreSQL schema file (schema.postgres.ts)
- [ ] Add proper enums for PostgreSQL
- [ ] Configure connection logic for DATABASE_URL
- [ ] Write tests for PostgreSQL operations

### 6.2 Database Abstraction
- [ ] Implement schema auto-selection based on DATABASE_URL
- [ ] Add PostgreSQL dependencies (pg, @neondatabase/serverless)
- [ ] Test switching between SQLite and PostgreSQL
- [ ] Update migration scripts for dual database support

### 6.3 Production Testing
- [ ] Test PostgreSQL connection on Vercel
- [ ] Verify Neon/Supabase integration
- [ ] Load testing with PostgreSQL
- [ ] Document deployment configurations

## Deployment Configuration

### Environment Setup
- [ ] Configure .env.local:
  - ANTHROPIC_API_KEY for LLM
  - DATABASE_URL for PostgreSQL (production)
- [ ] Run database migrations
- [ ] Verify Node.js 18+ installation

### Deployment Options

#### Option 1: Development/Local with SQLite
- [ ] No DATABASE_URL needed
- [ ] SQLite file created automatically
- [ ] Run migrations: `npm run db:migrate`
- [ ] Start server: `npm run dev`

#### Option 2: Production (After Phase 6)
##### VPS/Railway with SQLite
- [ ] Use persistent volume for database file
- [ ] Run migrations: `npm run db:migrate`
- [ ] Start server: `npm run start`

##### Serverless (Vercel) with PostgreSQL
- [ ] Set DATABASE_URL to PostgreSQL connection string
- [ ] Use Neon, Supabase, or Vercel Postgres
- [ ] Run migrations in CI/CD: `npm run db:migrate`
- [ ] Deploy: `vercel deploy`

## Key Implementation Decisions

### Database Strategy
- Drizzle ORM for type-safe database operations
- Dual database support (SQLite dev, PostgreSQL prod)
- Automatic schema selection based on environment
- Separate migrations per database dialect
- Built-in connection pooling for PostgreSQL

### MCP Integration
- Tools exposed to Claude for natural language processing
- Server-enforced confirmation for destructive operations
- Preview → Confirm → Apply pattern for bulk changes
- Fallback to manual UI on LLM failures

## Success Criteria
- [ ] All CRUD operations functional in both interfaces
- [ ] Natural language interface works with Claude
- [ ] Data persists correctly to database
- [ ] Clean, responsive UI with shadcn components
- [ ] Seamless database switching (SQLite ↔ PostgreSQL)
- [ ] Deployment works on both local and serverless

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Drizzle ORM | Type-safe queries, dual DB support |
| SQLite + PostgreSQL | Simple local dev, scalable production |
| MCP Server | Clean tool integration with Claude |
| shadcn/ui | Beautiful components, full control |
| Zod validation | Type-safe runtime validation |
| Separate schemas | Optimal for each database dialect |

## Implementation Priority
1. **SQLite database setup** - Simple foundation first
2. **Basic CRUD API with tests** - Core functionality with validation
3. **Split-view UI with shadcn** - Todos on top, chat on bottom
4. **MCP server setup** - Tool definitions for LLM
5. **LLM integration** - Conversational interface
6. **PostgreSQL support** - Production database last