# Implementation Plan: Todo Manager Application

## Overview
Building a simplified Todo Manager with dual interfaces (traditional UI and LLM-powered conversational interface) using MCP for tool integration.

## Phase 1: Project Setup and Foundation

### 1.1 Initialize Next.js Project
- [ ] Create Next.js 14+ app with TypeScript
- [ ] Configure App Router structure
- [ ] Set up ESLint and Prettier
- [ ] Initialize Git repository

### 1.2 Install Core Dependencies
```bash
# Core dependencies
npm install proper-lockfile zod date-fns zustand @modelcontextprotocol/sdk
npm install @anthropic-ai/sdk express-rate-limit

# UI dependencies (shadcn/ui)
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-slot
npx shadcn-ui@latest init

# Dev dependencies
npm install -D @types/node @types/proper-lockfile
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
├── lib/
│   ├── storage/
│   │   └── fileManager.ts    # Atomic writes, locking, backup
│   ├── mcp/
│   │   ├── server.ts         # MCP server setup
│   │   └── tools.ts          # Tool definitions
│   ├── validation/
│   │   └── schemas.ts        # Zod schemas
│   └── types/
│       └── todo.ts
├── data/
│   └── .gitkeep
└── .env.local                # ANTHROPIC_API_KEY
```

## Phase 2: Data Layer Implementation

### 2.1 Type Definitions & Validation
- [ ] Create Todo interface with all fields
- [ ] Define Zod schemas for validation:
  - TodoCreateSchema
  - TodoUpdateSchema
  - TodoFilterSchema
- [ ] Define API request/response types

### 2.2 File Storage Manager
- [ ] Implement atomic write with temp file + rename
- [ ] Add proper-lockfile integration
- [ ] Create backup mechanism (todos.json.bak)
- [ ] Bootstrap: create data dir and empty file on first run
- [ ] Handle corrupt JSON gracefully (restore from backup)
- [ ] Max 500 todos limit enforcement

## Phase 3: API Development

### 3.1 Core CRUD Endpoints
- [ ] POST /api/todos - Create with Zod validation
- [ ] GET /api/todos - List with filtering/sorting
- [ ] GET /api/todos/:id - Single todo retrieval
- [ ] PUT /api/todos/:id - Update with validation
- [ ] DELETE /api/todos/:id - Delete with confirmation
- [ ] POST /api/todos/:id/toggle - Status toggling

### 3.2 Conversation Endpoint
- [ ] POST /api/conversation - Rate limited (10 req/min)
- [ ] Integrate with MCP server
- [ ] Error handling for LLM failures
- [ ] Timeout and retry logic

### 3.3 Input Validation
- [ ] Server-generated UUIDs for IDs
- [ ] Server-generated timestamps
- [ ] Title length validation (1-200 chars)
- [ ] Priority enum validation
- [ ] Date format validation

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
- [ ] Configure .env.local with ANTHROPIC_API_KEY
- [ ] Set up data directory with proper permissions
- [ ] Verify Node.js 18+ installation

### Deployment Options
**Important**: Must deploy to environment with persistent filesystem

#### Option 1: Docker Container
- [ ] Create Dockerfile with Node.js base
- [ ] Mount volume for /data directory
- [ ] Configure environment variables

#### Option 2: VPS/Dedicated Server
- [ ] Install Node.js 18+
- [ ] Clone repository
- [ ] Run as systemd service or PM2
- [ ] Configure reverse proxy (nginx/caddy)

#### Option 3: Local Development
- [ ] npm run dev for development
- [ ] npm run build && npm run start for production

## Key Implementation Decisions

### Storage Strategy
- Atomic writes with proper-lockfile prevents corruption
- Backup file (todos.json.bak) for recovery
- Bootstrap creates directory/file automatically
- Direct file reads (no caching) for simplicity

### MCP Integration
- Tools exposed to Claude for natural language processing
- Server-enforced confirmation for destructive operations
- Preview → Confirm → Apply pattern for bulk changes
- Fallback to manual UI on LLM failures

## Success Criteria
- [ ] All CRUD operations functional in both interfaces
- [ ] Natural language interface works with Claude
- [ ] Data persists correctly to flat file
- [ ] Clean, responsive UI with shadcn components
- [ ] File operations are safe from corruption
- [ ] Deployment to persistent filesystem environment

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| MCP Server | Clean tool integration with Claude |
| proper-lockfile | Prevents concurrent write corruption |
| shadcn/ui | Beautiful components, full control |
| Zod validation | Type-safe runtime validation |
| No caching | Simplicity for 500 todos |
| Atomic writes | Data integrity without complexity |

## Implementation Priority
1. **File storage with protection** - Foundation must be solid
2. **Basic CRUD API** - Core functionality first
3. **UI with shadcn** - User-facing interface
4. **MCP server setup** - Tool definitions for LLM
5. **LLM integration** - Conversational interface last