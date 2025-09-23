# Implementation Plan: Web Deployment for Todo Manager

## Plan ID: 0003

## Overview
Deploy the Todo Manager demonstration app to Vercel with client-side SQLite, showcasing the SPIDER protocol methodology.

## Simplifications from Original Architecture

### What We Can Remove/Simplify:
1. **Database Server** - Using client-side SQLite instead
2. **Database Migrations** - No server migrations needed
3. **Connection Pooling** - No connections to manage
4. **Authentication** - Not needed for demo
5. **Rate Limiting** - Not needed for demo
6. **User Management** - Each browser is its own instance
7. **API Routes for Todos** - All todo operations run client-side
8. **Drizzle ORM on Server** - Move to client or simplify
9. **Environment Complexity** - Only need Anthropic API key

### What We Keep:
1. **Todo CRUD Operations** - Now client-side
2. **Conversational Interface** - Server-side for Anthropic API
3. **MCP Tools** - Converted to HTTP transport
4. **Dark Mode** - Already working
5. **Markdown Support** - Already working
6. **Conversation Persistence** - Already using localStorage

## Implementation Phases

### Phase 1: Client-Side SQLite Integration
**Objective**: Replace server SQLite with browser-based SQLite

**Deliverables**:
- Integrate sql.js library
- Create browser SQLite adapter
- Migrate todo operations to client-side
- Store database in IndexedDB
- Test all CRUD operations work locally
- Remove server-side database code

**Success Criteria**:
- All todo operations work without server calls
- Data persists across page refreshes
- Export/import database functionality works
- No server database dependencies remain

**Dependencies**: None - can start immediately

**Commit Message**: `[Spec 0003][Phase: client-sqlite] feat: Implement client-side SQLite with sql.js`

### Phase 2: MCP HTTP Transport Conversion
**Objective**: Convert MCP from stdio to HTTP transport (following MAIX pattern)

**Deliverables**:
- Install @modelcontextprotocol/sdk
- Create /api/mcp route handler
- Convert MCP tools to HTTP handlers
- Remove stdio-based MCP server
- Update chat API to use new MCP client
- Test all conversational commands work

**Success Criteria**:
- All MCP tools accessible via HTTP
- No stdio processes required
- Chat can execute todo operations
- Error handling works properly

**Dependencies**: None - independent of Phase 1

**Commit Message**: `[Spec 0003][Phase: mcp-http] feat: Convert MCP to HTTP transport`

### Phase 3: Simplify API Surface
**Objective**: Remove unnecessary server endpoints and simplify architecture

**Deliverables**:
- Remove /api/todos routes (all client-side now)
- Simplify /api/chat to only handle AI operations
- Remove database configuration files
- Clean up unused dependencies
- Update types and interfaces

**Success Criteria**:
- Only essential API routes remain (/api/chat, /api/mcp)
- No database-related server code
- Package.json cleaned of unused dependencies
- Build size reduced

**Dependencies**: Phases 1 and 2 complete

**Commit Message**: `[Spec 0003][Phase: simplify] refactor: Remove server-side todo operations`

### Phase 4: Vercel Deployment
**Objective**: Deploy to Vercel with minimal configuration

**Deliverables**:
- Create vercel.json if needed
- Configure environment variables (just ANTHROPIC_API_KEY)
- Deploy to Vercel
- Test all features work in production
- Update README with deployment instructions

**Success Criteria**:
- App accessible via Vercel URL
- All features work as in local development
- No database errors (since no server DB)
- Deployment completes in single command

**Dependencies**: Phases 1-3 complete

**Commit Message**: `[Spec 0003][Phase: deploy] feat: Deploy to Vercel`

### Phase 5: Polish and Documentation
**Objective**: Improve UX and document the demonstration

**Deliverables**:
- Add database export/import UI
- Add "Demo Mode" banner explaining local storage
- Create deployment guide
- Document SPIDER protocol usage
- Add reset/clear data button
- Optional: Add sample todos on first load

**Success Criteria**:
- Users understand data is local-only
- Easy to reset for fresh demos
- Clear documentation for others to deploy
- SPIDER methodology well documented

**Dependencies**: Phase 4 complete

**Commit Message**: `[Spec 0003][Phase: polish] feat: Add demo UI improvements and documentation`

## Architectural Decisions

### Client-Side SQLite Implementation
- **Library**: sql.js (SQLite compiled to WebAssembly)
- **Storage**: IndexedDB for persistence
- **Size**: ~1MB WASM file (acceptable for demo)
- **Alternative**: wa-sqlite if sql.js has issues

### MCP HTTP Transport
- **Pattern**: Follow MAIX implementation
- **Library**: @modelcontextprotocol/sdk
- **Transport**: StreamableHTTPClientTransport
- **Tools**: Define as async functions in route handler

### Deployment Simplicity
- **Platform**: Vercel only (no Railway needed)
- **Database**: None (client-side only)
- **Auth**: None (demo app)
- **Secrets**: Just ANTHROPIC_API_KEY

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| sql.js compatibility issues | Fallback to wa-sqlite or even localStorage |
| Large WASM file size | Lazy load only when needed |
| Browser storage limits | Add warning when approaching limits |
| MCP HTTP conversion complex | Use MAIX code as reference |
| Lost data on clear cache | Add export/import functionality |

## Testing Strategy

### Phase 1 Tests:
- Client-side SQLite CRUD operations
- IndexedDB persistence
- Export/import functionality

### Phase 2 Tests:
- MCP HTTP endpoint responses
- Tool execution via HTTP
- Error handling

### Phase 3 Tests:
- Ensure no broken dependencies
- Verify removed code not referenced

### Phase 4 Tests:
- Production deployment smoke tests
- All features work on Vercel

### Phase 5 Tests:
- UX improvements work
- Documentation accuracy

## Success Metrics

1. **Deployment Simplicity**: One-command deployment
2. **Zero Database Costs**: No external database
3. **Performance**: Instant todo operations (local)
4. **Demonstration Value**: Clear showcase of SPIDER protocol
5. **Developer Experience**: Easy to understand and modify

## Notes

- This is a DEMONSTRATION app, not production
- Each user gets their own isolated database
- No sync between devices (feature, not bug for demo)
- Focus on showcasing SPIDER methodology
- Simplicity over scalability

## Status Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Client-Side SQLite | `pending` | Ready to start |
| Phase 2: MCP HTTP Transport | `pending` | Can start in parallel |
| Phase 3: Simplify API | `pending` | Depends on 1 & 2 |
| Phase 4: Vercel Deployment | `pending` | Depends on 3 |
| Phase 5: Polish | `pending` | Depends on 4 |