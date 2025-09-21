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
# Database dependencies
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# For production (PostgreSQL)
npm install pg @neondatabase/serverless
npm install -D @types/pg

# Core dependencies
npm install zod date-fns zustand @modelcontextprotocol/sdk
npm install @anthropic-ai/sdk express-rate-limit

# UI dependencies (shadcn/ui)
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-slot
npx shadcn-ui@latest init

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
│   ├── schema.sqlite.ts      # SQLite schema
│   ├── schema.postgres.ts    # PostgreSQL schema
│   ├── schema.ts            # Auto-selected schema export
│   ├── client.ts            # Database connection
│   └── migrate.ts           # Migration runner
├── drizzle/
│   ├── sqlite/              # SQLite migrations
│   └── postgres/            # PostgreSQL migrations
├── lib/
│   ├── mcp/
│   │   ├── server.ts        # MCP server setup
│   │   └── tools.ts         # Tool definitions
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas
│   └── types/
│       └── todo.ts
├── drizzle.config.sqlite.ts  # SQLite config
├── drizzle.config.postgres.ts # PostgreSQL config
└── .env.local               # DATABASE_URL, ANTHROPIC_API_KEY
```

## Phase 2: Database Layer Implementation

### 2.1 Database Setup
- [ ] Create SQLite schema with indexes
- [ ] Create PostgreSQL schema with enums and indexes
- [ ] Set up auto-schema selection based on DATABASE_URL
- [ ] Configure Drizzle configs for both databases
- [ ] Add environment validation with Zod

### 2.2 Database Client
- [ ] Implement connection logic:
  - SQLite for local development
  - PostgreSQL with pg Pool for Node runtime
  - Neon HTTP driver for Edge runtime
- [ ] Add connection pooling for PostgreSQL
- [ ] Create global singleton for database instance

### 2.3 Migrations
- [ ] Generate initial migrations for SQLite
- [ ] Generate initial migrations for PostgreSQL
- [ ] Add CHECK constraints for SQLite enums
- [ ] Create migration runner script
- [ ] Test rollback procedures

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
- [ ] Set up Zustand store
- [ ] Define actions (CRUD operations)
- [ ] Server as source of truth
- [ ] Optimistic updates for better UX

### 4.2 shadcn/ui Components Setup
- [ ] Install and configure shadcn/ui
- [ ] Add required components:
  - Button, Input, Label
  - Dialog, Card
  - Checkbox, Select
  - Toast/Sonner for notifications

### 4.3 Core Components
- [ ] TodoList with clean layout
- [ ] TodoItem with checkbox and actions
- [ ] TodoForm with validation
- [ ] FilterBar (status, priority)
- [ ] Simple sorting controls

### 4.4 UI Features
- [ ] Priority color coding (low/medium/high)
- [ ] Due date display
- [ ] Overdue highlighting
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design (mobile/tablet/desktop)

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

## Phase 6: Testing & Deployment Preparation

### 6.1 Core Testing
- [ ] Storage manager tests (atomic writes, locking)
- [ ] API endpoint tests with Zod validation
- [ ] Concurrent write tests
- [ ] Corrupt file recovery tests

### 6.2 MCP & LLM Testing
- [ ] Mock MCP server tests
- [ ] Tool selection verification
- [ ] Confirmation flow tests
- [ ] Error handling tests

### 6.3 Manual Testing
- [ ] UI functionality across devices
- [ ] Conversational interface testing
- [ ] Edge cases and error scenarios

## Deployment Configuration

### Environment Setup
- [ ] Configure .env.local:
  - ANTHROPIC_API_KEY for LLM
  - DATABASE_URL for PostgreSQL (production)
- [ ] Run database migrations
- [ ] Verify Node.js 18+ installation

### Deployment Options

#### Option 1: Local/VPS with SQLite
- [ ] No DATABASE_URL needed
- [ ] SQLite file created automatically
- [ ] Run migrations: `npm run db:migrate:sqlite`
- [ ] Start server: `npm run start`

#### Option 2: Serverless (Vercel) with PostgreSQL
- [ ] Set DATABASE_URL to PostgreSQL connection string
- [ ] Use Neon, Supabase, or Vercel Postgres
- [ ] Run migrations in CI/CD: `npm run db:migrate:postgres`
- [ ] Deploy: `vercel deploy`

#### Option 3: Docker Container
- [ ] Create Dockerfile with Node.js base
- [ ] Choose SQLite or PostgreSQL via DATABASE_URL
- [ ] Run migrations on container start
- [ ] Configure environment variables

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
1. **Database setup with Drizzle** - Foundation must be solid
2. **Basic CRUD API** - Core functionality first
3. **UI with shadcn** - User-facing interface
4. **MCP server setup** - Tool definitions for LLM
5. **LLM integration** - Conversational interface last