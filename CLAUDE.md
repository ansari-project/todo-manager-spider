# Project Configuration for Todo Manager

## Codev Methodology
This project uses the Codev methodology with the SPIDER protocol for structured development.

### Active Protocol: SPIDER
- Protocol location: `codev/protocols/spider/protocol.md`
- Multi-agent consultation: ENABLED (using Zen MCP server)
- Default agents: GPT-5 (primary), Gemini Pro (secondary)

### Directory Structure
```
codev/
├── protocols/     # Development protocols
├── specs/        # Feature specifications
├── plans/        # Implementation plans
├── lessons/      # Lessons learned
└── resources/    # Supporting resources
```

### Workflow
This project uses the **SPIDER protocol** for all development:
- **S**pecify: Create specification in `codev/specs/`
- **P**lan: Create implementation plan in `codev/plans/`
- **I-D-E**: Implement-Defend-Evaluate cycle (per phase)
- **R**eview: Document lessons in `codev/lessons/`

**📖 SPIDER Protocol**:
- Quick Reference: `codev/protocols/spider/QUICK-REFERENCE.md`
- Full Details: `codev/protocols/spider/protocol.md`

### ⚠️ CRITICAL SPIDER REMINDERS FOR THIS PROJECT
1. **Phase Gates are MANDATORY** - Check protocol.md for Entry/Exit checklists
2. **TodoWrite is REQUIRED** - Create 4 tasks per phase (Implement, Test, Review, Commit)
3. **Tests IMMEDIATELY** - Never skip to next phase without tests
4. **Multi-agent review REQUIRED** - Minimum 2 models per phase
5. **Single commit per phase** - Atomic commits only

**If you skip Defend or Evaluate**: STOP and see "Violation Recovery Protocol" in protocol.md

## Project Overview
This is a Todo Manager application built using the SPIDER protocol methodology with both traditional UI and LLM-powered conversational interface.

## Development Guidelines
- Follow the SPIDER protocol for ALL features (see `codev/protocols/spider/protocol.md`)
- Maintain 1:1:1 correspondence: spec → plan → lessons (same filenames)
- Use Zen MCP multi-agent consultation (enabled by default)
- Document architectural decisions in appropriate codev/ subdirectory

## Lessons Learned

### Critical Process Improvements
1. **Always Follow I-D-E for Each Phase**: Don't skip the Defend and Evaluate steps even if implementation seems straightforward
2. **Write Tests Alongside Implementation**: Not retroactively - this catches issues early
3. **Multi-Agent Reviews Are Valuable**: They catch blind spots and provide diverse perspectives
4. **Simplification Over Complexity**: Avoid over-engineering - start simple and iterate
5. **Git Discipline is Critical**: NEVER use `git add -A` or similar - always stage files individually
6. **Protocol Adherence**: Follow SPIDER protocol exactly - complete each phase's I-D-E before moving to next

### Technical Decisions
1. **Database Over Flat Files**: Solves concurrency, locking, and scalability issues
2. **Drizzle ORM**: Provides type safety and database abstraction for dual SQLite/PostgreSQL support
   - See [Drizzle ORM Implementation Guide](codev/resources/drizzle-orm-guide.md) for detailed explanation
3. **MCP for LLM Tools**: Clean separation between tool definitions and implementation
4. **Split View UI**: Todos on top (2/3), chat on bottom (1/3) for optimal screen usage
5. **Server-Sent Events for Streaming**: Superior to WebSockets for server-to-client push in chat
6. **TodoFormatter Utility**: Centralized formatting logic prevents hallucinations

### Known Issues to Address
- **Pagination**: Must be added before production deployment
- **Rate Limiting**: Essential for API protection
- **MCP Server Management**: Needs production deployment strategy
- **Confirmation Dialogs**: Required for destructive operations

## Testing Commands
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test -- tests/db
npm run test -- tests/api
npm run test -- tests/components
npm run test -- tests/mcp

# Type checking
npm run typecheck

# Linting (if configured)
npm run lint
```

## API Key Configuration
Set `ANTHROPIC_API_KEY` in `.env.local` for conversational interface functionality.

## Deployment Notes
- **Serverless (Vercel)**: Use PostgreSQL, not SQLite
- **VPS (Railway)**: Both SQLite and PostgreSQL supported with persistent volumes
- **MCP Server**: Requires separate process management in production

## Technical Resources
- [Drizzle ORM Implementation Guide](codev/resources/drizzle-orm-guide.md) - Database abstraction approach
- [SPIDER Protocol](codev/protocols/spider/protocol.md) - Development methodology