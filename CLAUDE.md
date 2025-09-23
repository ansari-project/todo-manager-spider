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
1. **Specify**: Create detailed specification in `codev/specs/`
2. **Plan**: Develop implementation plan in `codev/plans/`
3. **Implement-Defend-Evaluate (PER PHASE)**:
   - **Implement**: Build code for this phase
   - **Defend**: Write tests IMMEDIATELY (not retroactively)
   - **Evaluate**: Get multi-agent review (GPT-5 + Gemini Pro minimum)
   - **Commit**: Single atomic commit before next phase
4. **Review**: Document lessons in `codev/lessons/`

## ⛔ MANDATORY PHASE GATE PROTOCOL

### BEFORE Starting ANY Phase:
1. **Verify Previous Phase**: Run `git log --oneline -5` to confirm previous phase commit exists
2. **Create Phase Todos** (MANDATORY - use TodoWrite with these EXACT 4 items):
   - "Phase N: Implement [feature]" → mark as "in_progress"
   - "Phase N: Write tests for [feature]" → mark as "pending"
   - "Phase N: Get multi-agent review" → mark as "pending"
   - "Phase N: Commit [feature]" → mark as "pending"
3. **State Intent**: Say "Starting Phase N Implementation" explicitly

### 🚫 AUTOMATIC STOP CONDITIONS:
STOP IMMEDIATELY if:
- Any "Write tests" task is still pending after implementation
- Any "Get multi-agent review" task is pending after tests
- Previous phase lacks a git commit
- You think "I'll write tests later" or "I'll get review later"

### ✅ PHASE COMPLETION CHECKLIST:
Before ANY phase transition, verify ALL:
- [ ] Implementation working (show output)
- [ ] Tests passing (paste `npm test` output)
- [ ] Review complete (show model feedback)
- [ ] Commit created (show `git log -1`)
- [ ] All 4 todos marked "completed"

### 🧠 COGNITIVE BREAK RULE:
After implementing, you MUST:
1. State: "Implementation done, switching to test mode"
2. Check TodoWrite for pending test task
3. State: "Writing tests for Phase N now"

## Project Overview
This is a Todo Manager application built using the SPIDER protocol methodology with both traditional UI and LLM-powered conversational interface.

## Development Guidelines
- Follow the SPIDER protocol for all new features
- Maintain specification-plan-lessons document triad (1:1:1 correspondence)
- Use multi-agent consultation at checkpoints
- Document all architectural decisions
- **NEVER skip the Defend phase** - write tests immediately after implementation
- **Complete I-D-E for EACH phase** before moving to the next phase

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