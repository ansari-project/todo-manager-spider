# Specification: Web Deployment for Todo Manager

## Specification ID: 0003

## Executive Summary
Deploy the Todo Manager DEMONSTRATION application to showcase the SPIDER protocol and codev methodology. This is not a production application but a technical demonstration of AI-assisted todo management with conversational interface.

**Key Innovation**: Service Worker as local MCP server - enabling full MCP protocol implementation with client-side database, solving the fundamental incompatibility between server-side MCP tools and browser-based storage.

## Problem Statement

### Current State
- Application runs locally on development machines only
- Requires manual setup of environment variables
- MCP server runs as a separate process
- Database is SQLite (file-based)
- No public access available

### Desired State
- Application publicly accessible via web URL
- Automatic scaling based on demand
- Secure handling of API keys and secrets
- Proper database for production use
- MCP server integrated or properly managed
- Zero-downtime deployments

### Business Context
Demonstrate the SPIDER protocol and codev methodology through a working example application. The deployment should be simple, accessible, and focused on showcasing the development process rather than production-grade features.

## Requirements

### Functional Requirements
1. **Core Application Features**
   - All existing todo CRUD operations must work
   - Conversational interface with streaming responses
   - Dark mode support with persistence
   - Markdown rendering in chat interface
   - Conversation history persistence

2. **MCP Server Integration**
   - MCP tools must be accessible to the chat API
   - Proper process management for MCP server
   - Error handling for MCP server failures
   - Tool execution with proper timeouts

3. **Data Persistence**
   - User todos must persist between sessions
   - Conversation history stored per user/session
   - Database migrations for schema changes
   - Data backup and recovery strategy

### Non-Functional Requirements (Demonstration Focus)
1. **Performance**
   - Reasonable response times for demo purposes
   - Streaming chat responses functional
   - Handle small number of demo users

2. **Security (Basic)**
   - HTTPS via Vercel
   - API keys in environment variables
   - Basic input validation

3. **Reliability**
   - Basic error handling
   - Functional for demonstrations

4. **Simplicity**
   - Easy to deploy and maintain
   - Minimal configuration
   - Focus on functionality over optimization

## Solution Options

### Option 1: Vercel Deployment with Client-Side SQLite
**Approach**: Deploy to Vercel with SQLite running in the browser

**Pros**:
- Zero-config deployment for Next.js apps
- Automatic SSL certificates
- Global CDN included
- SQLite runs entirely in the browser (via sql.js or wa-sqlite)
- Zero database costs
- Instant operations (no network latency)
- Full SQL capabilities on client-side
- Can export/import database files
- Each user has their own database
- Existing SQLite code mostly works

**Cons**:
- Todos are device-specific (not synced)
- Clearing browser data loses todos (unless exported)
- No sharing between users
- Initial load includes SQLite WASM (~1MB)

**Technical Requirements**:
- sql.js or wa-sqlite for browser SQLite
- IndexedDB for persistent storage
- Existing Drizzle ORM might work with adapter
- API routes only for AI chat
- Environment variables for Anthropic API key only

### Option 2: Railway Deployment (Container-based)
**Approach**: Deploy to Railway with persistent storage

**Pros**:
- Persistent filesystem for SQLite
- Can run MCP server as background process
- Longer timeout limits
- Built-in PostgreSQL available
- Automatic deployments from GitHub
- Environment variable management
- Cost-effective for small apps

**Cons**:
- Less global distribution than Vercel
- Manual scaling configuration
- No built-in CDN
- Requires Dockerfile or buildpacks
- Less mature platform

**Technical Requirements**:
- Configure build and start commands
- Set up health checks
- Configure environment variables
- Handle process management

### Option 3: AWS/Cloud Run (Full Control)
**Approach**: Deploy to AWS ECS or Google Cloud Run

**Pros**:
- Full control over infrastructure
- Can run any process configuration
- Mature, enterprise-ready platforms
- Fine-grained scaling controls
- Multiple region deployment
- Professional monitoring tools

**Cons**:
- Complex setup and configuration
- Higher operational overhead
- Requires DevOps expertise
- More expensive for small apps
- Manual SSL certificate management

**Technical Requirements**:
- Container orchestration setup
- Load balancer configuration
- Database setup and management
- CI/CD pipeline configuration

## Recommended Approach: Service Worker as Local MCP Server

### The Innovation
After extensive analysis and expert consultation, we've identified a unique solution that solves the fundamental incompatibility between server-side MCP and client-side databases:

**Service Worker acts as a local MCP server in the browser**

### How It Works
1. **Service Worker Registration**: Browser registers SW on app load
2. **Request Interception**: SW intercepts all `/api/mcp/*` requests
3. **Local Execution**: MCP tools execute against client-side SQLite
4. **Transparent Protocol**: App uses standard MCP protocol, unaware it's local
5. **Offline Capable**: Once cached, works without internet

### Architecture Flow
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

### Why This Approach?
- **Solves the core problem**: MCP tools can access local database
- **True MCP protocol**: Not a workaround or compromise
- **Zero server complexity**: No database, no connections, no scaling issues
- **Perfect for demos**: Showcases innovative web capabilities
- **92% browser support**: Works in all modern browsers

## Implementation Considerations

### Storage Architecture

#### Client-Side SQLite with sql.js
- **Technology**: SQLite compiled to WebAssembly
- **Persistence**: IndexedDB with auto-save
- **Performance**: Run in Web Worker to avoid blocking
- **Size**: ~1MB WASM file (acceptable for demo)
- **Compatibility**: 97% browser support

#### Service Worker Integration
- Service Worker has full access to IndexedDB
- Can execute SQL queries via sql.js
- Maintains database connection across requests
- Handles concurrent operations safely

### MCP Implementation Strategy

**Final Decision: Service Worker MCP Server**

After evaluating multiple approaches:
1. ~~Server-side MCP~~ - Can't access client database
2. ~~Client orchestration~~ - Not true MCP protocol
3. ~~Hybrid approach~~ - Too complex for demo
4. ✅ **Service Worker MCP** - Perfect solution!

The Service Worker approach uniquely solves all constraints:
- Implements real MCP protocol
- Accesses client-side database
- Works offline
- No server complexity

### Environment Variables Required
```
ANTHROPIC_API_KEY=xxx  # Only server-side variable needed
NEXT_PUBLIC_APP_URL=xxx (optional)
```

### Browser Requirements
- Chrome 45+ / Edge 17+ / Firefox 44+ / Safari 11.1+
- Mobile: iOS Safari 11.3+ / Android 4.4+
- ~92% global browser coverage

### Monitoring and Observability
- Error tracking (Sentry)
- Performance monitoring
- Uptime monitoring
- Log aggregation

## Success Criteria

1. **Deployment Success**
   - Application accessible via HTTPS URL
   - All features working as in local development
   - No data loss during normal operations

2. **Performance Metrics**
   - 95th percentile response time < 3s
   - Zero failed requests under normal load
   - Successful handling of 100 concurrent users

3. **Operational Metrics**
   - Deployment time < 5 minutes
   - Rollback capability < 1 minute
   - Zero-downtime deployments achieved

## Open Questions

### Critical (Blocks Progress)
1. Should we implement user authentication now or deploy as single-user initially?
2. Is the 10-second Vercel timeout acceptable for complex AI operations?
3. Do we need to implement rate limiting before public deployment?

### Important (Affects Design)
1. How should we handle MCP server process in serverless environment?
2. Should conversation history be user-specific or session-based?
3. What's the backup strategy for production data?

### Nice-to-Know
1. Should we add analytics tracking?
2. Do we want custom domain immediately?
3. Should we implement A/B testing capability?

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API key exposure | High | Medium | Use environment variables, implement rate limiting |
| Database connection exhaustion | High | Medium | Connection pooling, query optimization |
| MCP server crashes | Medium | Medium | Health checks, automatic restarts, fallback responses |
| Unexpected traffic spike | Medium | Low | Auto-scaling, rate limiting, CDN caching |
| Data loss | High | Low | Regular backups, point-in-time recovery |

## Dependencies
- Existing todo manager application
- Anthropic API key for production
- Domain name (optional)
- SSL certificate (automatic with most platforms)

## Discussion Summary and Design Evolution

### Initial Approach (Rejected)
Started with traditional server-side deployment options (Vercel with PostgreSQL, Railway, AWS). Expert review identified these as overly complex for a demonstration app.

### Key Discovery
Investigation of MAIX project revealed it uses server-side MCP with PostgreSQL. However, our goal of client-side SQLite creates a fundamental incompatibility: server-side MCP tools cannot access browser databases.

### The Problem-Solution Journey
1. **Simplification Decision**: Since this is a DEMO app (not production), removed auth, rate limiting, and complex security requirements
2. **Client-Side Storage**: Proposed using localStorage, then evolved to client-side SQLite via sql.js for better functionality
3. **MCP Dilemma**: How to maintain MCP protocol compatibility with client-side database?
4. **Breakthrough**: Service Worker as local MCP server!

### Final Architecture: Service Worker MCP
- **Innovation**: Service Worker intercepts MCP protocol requests and handles them locally
- **Benefits**: Full MCP compatibility, zero server complexity, works offline
- **Browser Support**: 92% compatibility (all modern browsers)
- **Fallback**: Degrades gracefully for unsupported browsers

## Consultation Log

### Multi-Agent Review Results

**GPT-5 Review (Score: 7/10)** - Comprehensive technical analysis
**Gemini Pro Review (Score: 8/10)** - Strategic architectural recommendations

**Critical Issue Both Identified**: Server-side MCP tools cannot access client-side SQLite database
**Their Solution**: Client-orchestrated tool execution
**Our Innovation**: Service Worker as local MCP server (better than client orchestration)

### Updated Analysis: Learning from MAIX Implementation

#### MAIX's Successful Vercel-Only Deployment

The maix project (github.com/ansari-project/maix) successfully deploys MCP on Vercel using:

1. **HTTP-based MCP Transport**
   - Uses `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport`
   - No stdio process required
   - Tools defined directly in API routes using `mcp-handler` package

2. **Simple Architecture**
   - Single `/api/mcp` route handles all MCP requests
   - Tools are regular async functions within the route
   - No separate server process or complex orchestration

#### Revised Architecture for Demonstration App

**Since this is a DEMONSTRATION app, not production:**
- Simplicity > Production-grade features
- Pure Vercel deployment is preferred
- No need for rate limiting, authentication, or complex security
- Focus on showcasing SPIDER protocol methodology

#### Simplified Requirements for Demonstration

**As a DEMO app:**
- No authentication required initially
- Basic API key protection (environment variable)
- No rate limiting needed for demo
- Focus on functionality over security hardening
- Can add basic auth later if needed for cost control

#### 3. Client-Side SQLite Benefits

**Browser SQLite Advantages:**
- No database connection management
- No serverless connection pooling issues
- No region co-location concerns
- Existing SQLite queries work
- Full SQL capabilities in browser
- Can export/import databases
- Familiar development experience

#### 4. Timeout & Cost Management

**Consensus on Async Architecture:**
- Queue-based processing for operations >30s
- Implement job IDs with SSE status updates
- Set strict token budgets and tool timeouts
- Cost alerts and spending limits essential

#### 5. Production Readiness Gaps

**Must Address Before Launch:**
- Backup and restore procedures tested
- Monitoring: Sentry + metrics + uptime checks
- Load testing (100 concurrent users minimum)
- Graceful timeout handling
- PII scrubbing in logs

## Revised Recommendation: Pure Vercel Deployment (Following MAIX Pattern)

### Architecture: Vercel-Only with HTTP-based MCP

**Phase 1: Basic Deployment**
- Convert MCP server from stdio to HTTP transport
- Use `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport`
- Integrate sql.js for client-side SQLite
- Move database operations to browser
- Deploy everything to Vercel
- Environment variable for Anthropic API key only

**Phase 2: Polish & Documentation**
- Add conversation persistence
- Improve error handling
- Create deployment guide
- Document SPIDER protocol usage

**Phase 3: Optional Enhancements**
- Basic auth if cost control needed
- Simple usage tracking
- Performance optimization

### Implementation Approach

1. **Refactor MCP Integration**
   - Replace stdio-based server with HTTP handlers
   - Convert tools to API route functions
   - Use the MAIX pattern as reference

2. **Client-Side SQLite**
   - Integrate sql.js or wa-sqlite
   - Adapt Drizzle ORM to work with browser SQLite
   - Store database in IndexedDB for persistence

3. **Deployment**
   - Single `vercel` command deployment
   - Automatic preview deployments
   - Environment variables via Vercel dashboard