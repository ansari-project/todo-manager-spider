# Implementation Plan 0004: Database Architecture Simplification

## Overview
Plan for migrating from dual SQL database architecture to pure client-side IndexedDB storage.

## Phases

### Phase 1: Remove SQL Dependencies ✅
**Goal**: Clean removal of all SQL/Drizzle dependencies

**Tasks**:
- [x] Remove Drizzle packages from package.json
- [x] Remove better-sqlite3 and sql.js
- [x] Remove database scripts from package.json

**Verification**: Package.json has no SQL dependencies

### Phase 2: Create IndexedDB Client ✅
**Goal**: Build simple, type-safe IndexedDB storage layer

**Tasks**:
- [x] Create storage-client.ts with IndexedDB operations
- [x] Define TypeScript types for Todo
- [x] Implement CRUD operations
- [x] Add indexes for common queries

**Verification**: Storage client handles all todo operations

### Phase 3: Update Application Layer ✅
**Goal**: Connect UI to new storage layer

**Tasks**:
- [x] Update page.tsx to use storage-client
- [x] Simplify API routes to placeholders
- [x] Remove Drizzle imports throughout

**Verification**: App works with IndexedDB

### Phase 4: Cleanup and Documentation ✅
**Goal**: Remove obsolete files and document changes

**Tasks**:
- [x] Delete old database files
- [x] Write specification document
- [ ] Write tests for IndexedDB client
- [ ] Get expert review

**Verification**: Clean codebase with documentation

## Risk Mitigation
- **Data Loss**: Export/import functions provided
- **Browser Support**: IndexedDB supported in all modern browsers
- **Performance**: Indexes on common query fields

## Success Criteria
1. No SQL dependencies in package.json
2. All todo operations work via IndexedDB
3. Successfully deploys to Vercel
4. Tests pass for storage operations

## Timeline
- Phase 1-3: 30 minutes (completed)
- Phase 4: 20 minutes (in progress)

## Phase 5: Service Worker MCP Integration ✅ (Added 2025-09-23)
**Goal**: Implement MCP protocol directly in Service Worker

**Tasks Completed**:
- [x] Create sw-mcp-indexeddb.js with full MCP implementation
- [x] Handle JSON-RPC 2.0 protocol
- [x] Implement tool handlers (create, list, update, delete)
- [x] Add user-friendly formatting
- [x] Fix date serialization issues
- [x] Standardize tool naming convention
- [x] Add version tracking for cache busting

**Key Implementation Details**:
1. **Service Worker Registration**: Via ServiceWorkerProvider component
2. **Request Interception**: Catches `/api/mcp/*` requests
3. **Protocol Handling**: Full JSON-RPC 2.0 compliance
4. **Database Access**: Direct IndexedDB operations
5. **Tool Format**: Underscore naming (todo_list, todo_create, etc.)

**Challenges Resolved**:
- Service Worker cache invalidation (solved with version bumping)
- Database name synchronization (standardized to 'todo-manager')
- Date format compatibility (ISO strings in SW, Date objects in app)
- Tool naming mismatches (unified to underscore format)

**Verification**:
- Chat interface successfully executes todo operations
- Service Worker intercepts all MCP requests
- Zero server-side dependencies for todo operations

## SPIDER Protocol Adherence
**WARNING**: This plan is being created retroactively. In future, plans must be created BEFORE implementation begins, and each phase must follow I-D-E-C strictly.