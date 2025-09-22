# Specification: Web Deployment for Todo Manager

## Specification ID: 0003

## Executive Summary
Deploy the Todo Manager application with conversational interface to a publicly accessible web platform, enabling users to access the application from anywhere with proper security and scalability.

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
Enable users to access the Todo Manager from any device without local setup, while maintaining the conversational AI capabilities and ensuring data persistence and security.

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

### Non-Functional Requirements
1. **Performance**
   - Response time < 2s for todo operations
   - Streaming chat responses start < 3s
   - Support 100+ concurrent users minimum
   - Page load time < 3s

2. **Security**
   - HTTPS only (no HTTP)
   - API keys stored securely (environment variables)
   - Rate limiting on API endpoints
   - Input validation and sanitization
   - CORS properly configured

3. **Reliability**
   - 99.9% uptime target
   - Graceful error handling
   - Automatic restart on crashes
   - Health check endpoints

4. **Scalability**
   - Horizontal scaling capability
   - Database connection pooling
   - Static asset CDN delivery
   - Efficient caching strategy

## Solution Options

### Option 1: Vercel Deployment (Serverless)
**Approach**: Deploy to Vercel with serverless functions

**Pros**:
- Zero-config deployment for Next.js apps
- Automatic SSL certificates
- Global CDN included
- Automatic scaling
- Preview deployments for PRs
- Easy environment variable management
- Built-in analytics

**Cons**:
- MCP server as separate process is challenging
- Serverless function timeouts (10s hobby, 60s pro)
- SQLite not suitable (ephemeral filesystem)
- Cold starts affect performance
- Vendor lock-in to Vercel platform

**Technical Requirements**:
- PostgreSQL database (Vercel Postgres or external)
- Rewrite MCP integration for serverless
- Implement connection pooling
- Handle function timeouts gracefully

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

## Recommended Approach

**Primary Choice: Vercel** for immediate deployment with following adaptations:
1. Use Vercel Postgres or Neon for database
2. Refactor MCP server integration to work within API route constraints
3. Implement aggressive caching for static content
4. Use edge functions where appropriate

**Fallback Option: Railway** if MCP server integration proves problematic on Vercel:
1. Use Railway's PostgreSQL add-on
2. Deploy as single container with process management
3. Add Cloudflare for CDN if needed

## Implementation Considerations

### Database Migration
- From SQLite to PostgreSQL
- Drizzle ORM already supports both
- Need to update connection strings
- Test migrations thoroughly

### MCP Server Adaptation
- **Option A**: Inline MCP tools directly in API routes (no separate server)
- **Option B**: Deploy MCP server as separate service (microservices architecture)
- **Option C**: Use background workers for long-running operations

### Environment Variables Required
```
ANTHROPIC_API_KEY=xxx
DATABASE_URL=xxx
NEXTAUTH_URL=xxx (if adding auth)
NEXT_PUBLIC_APP_URL=xxx
```

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

## Consultation Log

### Multi-Agent Review Results

**GPT-5 Review (Score: 7/10)** - Comprehensive technical analysis
**Gemini Pro Review (Score: 8/10)** - Strategic architectural recommendations

### Key Consensus Points from Expert Review

Both experts identified the MCP server adaptation as the critical challenge, with GPT-5 emphasizing security/operational concerns and Gemini Pro advocating for a hybrid architecture.

#### 1. MCP Server Architecture - CRITICAL DECISION

**Strong Consensus: Hybrid Model Recommended**
- **GPT-5**: "MCP stdio process not viable on serverless. Separate microservice recommended."
- **Gemini Pro**: "Hybrid model deserves primary consideration, not just as fallback."

**Recommended Architecture:**
- Frontend + Simple APIs on Vercel
- MCP Server as separate service on Railway/Fly.io
- Secure server-to-server communication
- Benefits: No timeout constraints, proper process management, independent scaling

#### 2. Security Requirements - HIGH PRIORITY

**Both Experts Strongly Recommend:**
- **Authentication from Day 1** (not Phase 2)
  - GPT-5: "High abuse risk without auth for Anthropic spend"
  - Gemini Pro: "Session-based identification foundational for security"
- **Aggressive Rate Limiting**
  - 30 req/min general API, 3-5 req/min for AI chat (tighter than originally planned)
- **Additional Security:**
  - Cloudflare Turnstile for bot protection
  - CSP headers and markdown sanitization
  - Input validation with Zod
  - Tool input sanitization to prevent prompt injection

#### 3. Database & Connection Management

**Critical Requirements Identified:**
- Use serverless-optimized drivers (@neondatabase/serverless)
- Avoid node-postgres pooling in serverless
- Co-locate DB and function regions
- Implement migration pipeline via CI/CD
- Enable Point-in-Time Recovery

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

## Revised Recommendation Based on Expert Consensus

### Primary Architecture: Hybrid Deployment

**Phase 1: MVP with Auth (2-3 days)**
- Deploy Next.js to Vercel
- Deploy MCP server to Railway as separate service
- Implement basic NextAuth.js (magic links or social)
- PostgreSQL on Neon (co-located region)
- Basic rate limiting with Upstash Redis

**Phase 2: Security & Reliability (2 days)**
- Add Cloudflare Turnstile
- Implement comprehensive input validation
- Add CSP headers and markdown sanitization
- Set up monitoring (Sentry + uptime)
- Configure backup/restore procedures

**Phase 3: Production Optimization (2-3 days)**
- Queue system for long operations
- Cost monitoring and alerts
- Load testing and optimization
- Documentation and runbooks

### Alternative: Full Vercel (If Hybrid Too Complex)

Only if hybrid proves too complex initially:
- Embed MCP tools directly in API routes
- Accept 60s timeout limitations
- Implement aggressive caching
- Plan migration to hybrid for Phase 2