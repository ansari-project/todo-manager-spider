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

## SPIDER Protocol Adherence
**WARNING**: This plan is being created retroactively. In future, plans must be created BEFORE implementation begins, and each phase must follow I-D-E-C strictly.