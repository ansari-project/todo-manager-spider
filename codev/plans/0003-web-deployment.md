# Implementation Plan: Web Deployment for Todo Manager

## Plan ID: 0003

## Overview
Deploy the Todo Manager demonstration app to Vercel with Service Worker MCP architecture, showcasing the SPIDER protocol methodology through an innovative browser-based MCP implementation.

## Architecture: Service Worker as Local MCP Server

### Innovation Summary
Instead of traditional server-side MCP or client orchestration, we implement the MCP server directly in a Service Worker. This enables:
- Full MCP protocol compliance
- Access to client-side SQLite database
- Zero server infrastructure for data
- Works offline once cached
- 92% browser compatibility

### What We Can Remove/Simplify:
1. **Database Server** - Using client-side SQLite via sql.js
2. **Database Migrations** - No server migrations needed
3. **Connection Pooling** - No connections to manage
4. **Authentication** - Not needed for demo
5. **Rate Limiting** - Not needed for demo
6. **User Management** - Each browser is its own instance
7. **Server API Routes for Todos** - All operations via Service Worker
8. **Drizzle ORM on Server** - Client-side only
9. **Environment Complexity** - Only need Anthropic API key

### What We Keep:
1. **Todo CRUD Operations** - Via Service Worker MCP
2. **Conversational Interface** - Server-side for Anthropic API
3. **MCP Protocol** - Full implementation in Service Worker
4. **Dark Mode** - Already working
5. **Markdown Support** - Already working
6. **Conversation Persistence** - localStorage + IndexedDB

## Implementation Phases

### Phase 1: Service Worker Setup and Registration
**Objective**: Create Service Worker infrastructure for MCP implementation

**Deliverables**:
- Create `public/sw-mcp.js` Service Worker file
- Add Service Worker registration in `_app.tsx`
- Implement request interception for `/api/mcp/*` routes
- Add Service Worker lifecycle management
- Create fallback for unsupported browsers
- Set up caching strategy for offline support
- Add Service Worker update mechanism

**Success Criteria**:
- Service Worker successfully registers
- Intercepts `/api/mcp/*` requests
- Graceful fallback for unsupported browsers
- Update notifications work

**Dependencies**: None - can start immediately

**Commit Message**: `[Spec 0003][Phase 1: service-worker] feat: Set up Service Worker infrastructure`

### Phase 2: Client-Side SQLite with sql.js
**Objective**: Implement browser-based SQLite database

**Deliverables**:
- Install and configure sql.js WebAssembly module
- Create SQLite database manager in Web Worker
- Implement IndexedDB persistence layer
- Add auto-save with debouncing
- Migrate Drizzle ORM to work with sql.js
- Create database export/import utilities
- Handle private browsing mode (memory-only fallback)
- Add progress indicators for WASM loading

**Success Criteria**:
- SQLite runs in browser via WebAssembly
- Data persists in IndexedDB
- Drizzle ORM works with client SQLite
- Export/import functionality works
- ~1MB WASM loads efficiently

**Dependencies**: Phase 1 (Service Worker ready)

**Commit Message**: `[Spec 0003][Phase 2: client-sqlite] feat: Implement client-side SQLite with sql.js`

### Phase 3: MCP Protocol Implementation in Service Worker
**Objective**: Implement full MCP protocol in the Service Worker

**Deliverables**:
- Implement MCP JSON-RPC 2.0 protocol handler
- Create `initialize` method handler
- Create `tools/list` method to expose todo tools
- Create `tools/call` method for tool execution
- Define todo tool schemas (create, update, delete, list)
- Connect tools to SQLite database operations
- Add proper error handling and responses
- Implement MCP protocol version negotiation

**Success Criteria**:
- Full MCP protocol compliance
- All MCP methods respond correctly
- Tools execute against local SQLite
- Proper JSON-RPC error handling
- Protocol version compatibility

**Dependencies**: Phase 2 (SQLite ready)

**Commit Message**: `[Spec 0003][Phase 3: mcp-protocol] feat: Implement MCP protocol in Service Worker`

### Phase 4: Connect Chat API to Service Worker MCP
**Objective**: Integrate the conversational interface with Service Worker MCP

**Deliverables**:
- Modify `/api/chat` to detect tool requests from Anthropic
- Create MCP client that communicates with Service Worker
- Implement tool request/response flow
- Handle streaming responses with tool executions
- Add fallback for browsers without Service Worker
- Remove old server-side MCP implementation
- Test all conversational commands

**Success Criteria**:
- AI can request todo operations via MCP
- Service Worker executes tools locally
- Results flow back to AI correctly
- Streaming responses work with tools
- Graceful degradation for unsupported browsers

**Dependencies**: Phase 3 (MCP protocol ready)

**Commit Message**: `[Spec 0003][Phase 4: integration] feat: Connect chat API to Service Worker MCP`

### Phase 5: Vercel Deployment and Polish
**Objective**: Deploy to Vercel and add demo features

**Deliverables**:
- Configure Service Worker for production
- Set up Vercel deployment settings
- Configure ANTHROPIC_API_KEY environment variable
- Add database export/import UI
- Add "Demo Mode" banner explaining local storage
- Create deployment guide
- Add reset/clear data button
- Add sample todos on first load
- Test all features in production

**Success Criteria**:
- App accessible via Vercel URL
- Service Worker MCP works in production
- All features work as in development
- Clear user communication about local storage
- One-command deployment

**Dependencies**: Phase 4 complete

**Commit Message**: `[Spec 0003][Phase 5: deploy] feat: Deploy to Vercel with demo features`

## Architectural Decisions

### Service Worker MCP Architecture
- **Pattern**: Service Worker acts as local MCP server
- **Innovation**: First known implementation of MCP in Service Worker
- **Benefits**: Full protocol compliance with local database access

### Client-Side SQLite Implementation
- **Library**: sql.js (SQLite compiled to WebAssembly)
- **Storage**: IndexedDB for persistence
- **Size**: ~1MB WASM file (acceptable for demo)
- **Performance**: Runs in Web Worker to avoid blocking
- **Alternative**: wa-sqlite if sql.js has issues

### MCP Protocol Flow
```
User Input → Chat UI → /api/chat → Anthropic API
                ↓
           Tool Request
                ↓
     Service Worker (intercepts /api/mcp/*)
                ↓
      Execute on local SQLite (sql.js)
                ↓
           Tool Result
                ↓
        Continue Conversation
```

### Deployment Simplicity
- **Platform**: Vercel only (no Railway needed)
- **Database**: None (server-side)
- **Auth**: None (demo app)
- **Secrets**: Just ANTHROPIC_API_KEY
- **Browser Support**: 92% (Service Workers)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| sql.js compatibility issues | Fallback to wa-sqlite or even localStorage |
| Large WASM file size | Lazy load only when needed, use Web Worker |
| Browser storage limits | Add warning when approaching limits |
| Server tools can't access client DB | Client-orchestrated tool execution |
| Lost data on clear cache | Add export/import functionality |
| UI blocking from DB operations | Run sql.js in Web Worker |
| IndexedDB unavailable (private mode) | Detect and fallback to memory-only mode |

## Testing Strategy

### Phase 1 Tests:
- Client-side SQLite CRUD operations
- IndexedDB persistence with auto-save
- Export/import functionality
- Web Worker performance
- Private browsing mode detection

### Phase 2 Tests:
- Client-side tool execution
- Tool request/response flow
- Error handling
- State synchronization

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

## Expert Review Consensus

**GPT-5 (Score: 8/10)** and **Gemini Pro (Score: 9/10)** both identified the critical architectural issue:
- Server-side MCP tools cannot access client-side SQLite database
- Solution: Client-orchestrated tool execution
- Additional recommendations: Web Worker for sql.js, IndexedDB fallback handling

**Key Architecture Change**:
Instead of server-side MCP tools, the client will:
1. Receive tool requests from the AI via the chat API
2. Execute tools locally against its SQLite database
3. Send results back to continue the conversation
4. This maintains the client-only database architecture

## Status Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Service Worker Setup | `pending` | Ready to start |
| Phase 2: Client-Side SQLite | `pending` | Depends on Phase 1 |
| Phase 3: MCP Protocol Implementation | `pending` | Depends on Phase 2 |
| Phase 4: Chat API Integration | `pending` | Depends on Phase 3 |
| Phase 5: Vercel Deployment | `pending` | Depends on Phase 4 |