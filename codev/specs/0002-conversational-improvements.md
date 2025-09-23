# Specification: Conversational Interface Improvements

## Feature: 0002-conversational-improvements
## Date: 2025-09-21
## Status: Implemented
## Updated: 2025-09-23

## Problem Statement

The current conversational interface has critical limitations:

1. **No Memory**: Each request is stateless - the system forgets previous messages immediately
2. **No Tool Result Visibility**: Claude responds but doesn't show what the tools actually did
3. **Single Tool Limitation**: Can only execute one tool per message
4. **No Agentic Loop**: Can't chain multiple operations or reason about results
5. **Lost Context**: Frontend maintains message history, but backend doesn't use it

## Current Architecture Analysis

### Frontend (ConversationalInterface.tsx)
- ✅ Maintains message history in React state
- ✅ Shows conversation in UI
- ❌ Only sends current message to backend (no history)

### Backend (api/chat/route.ts)
- ❌ Stateless - creates new conversation each request
- ❌ Only handles single tool use
- ❌ Doesn't inspect tool results to provide meaningful feedback
- ❌ No conversation memory between requests

## Proposed Solution

### Architecture Options

#### Option 1: Server-Side Session Management
**Approach**: Store conversation history on server using sessions
- **Pros**:
  - True persistence across page refreshes
  - Can implement conversation branching
  - Scalable with Redis/database backing
- **Cons**:
  - Requires session infrastructure
  - More complex implementation
  - Need to handle session cleanup

#### Option 2: Client-Side History with Full Context
**Approach**: Send entire conversation history with each request
- **Pros**:
  - Simple implementation
  - No server state needed
  - Works with serverless
- **Cons**:
  - Growing request size
  - Token limit concerns
  - No persistence across sessions

#### Option 3: Service Worker MCP Architecture (IMPLEMENTED)
**Approach**: Service Worker acts as local MCP server, intercepting requests
- **Implementation**:
  1. Service Worker intercepts `/api/mcp/*` requests
  2. Handles MCP protocol locally using IndexedDB
  3. Server sends tool requests, client executes via Service Worker
  4. Streaming responses show real-time progress
- **Pros**:
  - Zero-latency tool execution
  - Works offline for local operations
  - Clean separation of concerns
  - No server-side MCP complexity
- **Cons**:
  - Service Worker caching challenges
  - Browser compatibility requirements
  - Debugging complexity

### Agentic Loop Design

```typescript
interface AgenticResponse {
  thoughts: string[]      // Claude's reasoning process
  actions: ToolAction[]   // Tools executed
  results: ToolResult[]   // Results from tools
  summary: string        // Final user-facing message
}
```

**Loop Process**:
1. Receive user message with conversation context
2. Claude analyzes request and current todo state
3. Claude can execute multiple tools in sequence
4. After each tool, Claude evaluates results
5. Claude decides if more actions needed (max 5 iterations)
6. Return comprehensive response with all actions taken

### Technical Requirements

#### 1. Conversation Memory
- Send last 10 messages as context
- Include tool results in conversation history
- Maintain assistant's reasoning visible to user

#### 2. Multi-Tool Execution
```typescript
while (needsMoreActions && iterations < 5) {
  const action = await claude.decideNextAction(context, previousResults)
  const result = await executeTool(action)
  previousResults.push(result)
  context.update(result)
  needsMoreActions = await claude.evaluateCompletion(context)
  iterations++
}
```

<!-- You can be more flexible for now -- you can include the whole conversation-->

#### 3. Enhanced System Prompt
```
You are a Todo Manager assistant with access to MCP tools.

IMPORTANT: You can use multiple tools to complete a request. After each tool use:
1. Examine the results carefully
2. Decide if the task is complete or needs more actions
3. Provide clear feedback about what was done

When listing todos after changes, ALWAYS show the actual todos returned, not generic messages.

Example good response: "I've created your todo 'Buy groceries'. Here are your current todos: ..."
Example bad response: "I've created your todo for you."
```

#### 4. Result Inspection
- Parse tool results to extract meaningful data
- Format todo lists in readable format
- Show actual changes made (before/after)

### API Contract Changes

#### Request:
```typescript
interface ChatRequest {
  message: string
  conversationHistory?: Message[]  // Last 10 messages
  requestId: string                // Client-generated UUID for idempotency
  sessionId?: string               // Optional for future session management
}
```

#### Response:
```typescript
interface ChatResponse {
  response: string          // User-facing message
  actions?: ToolAction[]    // What tools were called
  thoughts?: string[]       // Claude's reasoning (optional debug info)
}
```

<!-- I also think we need to make improvements to the UI. WE need to scroll to the bottom, we need 
to show that we are thinking -->

### Implementation Phases (ACTUAL)

#### Phase 1: Service Worker MCP Setup ✅
- Implemented Service Worker as local MCP server
- Service Worker intercepts `/api/mcp/*` requests
- Handles MCP protocol with IndexedDB backend
- Tool execution happens client-side with zero latency

#### Phase 2: Streaming Communication ✅
- Server sends tool requests via SSE stream
- Client executes tools through Service Worker
- Results sent back for continuation
- Real-time progress updates

#### Phase 3: Tool Integration ✅
- Standardized tool naming (underscore format: todo_list, todo_create)
- User-friendly formatting without showing IDs
- Proper date handling between Service Worker and app
- TodoFormatter for consistent output

#### Phase 4: Enhanced UI ✅
- Streaming status indicators
- Error handling with user feedback
- Auto-scroll to latest messages
- Clear conversation button

## Success Criteria

1. **Memory Test**: Claude remembers previous todos mentioned in conversation
2. **Multi-Step Test**: "Create a grocery todo and then show me all my todos" works correctly
3. **Context Test**: "Mark it as complete" works when referring to previously mentioned todo
4. **Result Quality**: Responses include actual todo content, not just confirmations

## Out of Scope

- Persistent sessions across browser sessions
- Multi-user conversation isolation
- Conversation branching/history management
- Voice interface
- Proactive suggestions

## Risks and Mitigations

1. **Token Limits**:
   - Sliding window with token counting (6-8k max)
   - Include last 2-3 messages + rolling summary if over budget
   - Server computes actual token cost
<!-- Don't care about this -->

2. **Infinite Loops**:
   - Hard limit of 3-5 iterations per request
   - Wall-clock timeout of 20-30 seconds
   - Early termination if no new evidence for 2 iterations

3. **Response Time**:
   - Show progress indicators for multi-step operations
   - Support user cancellation with partial results
   - Parallel execution for independent read operations

4. **Error Cascading**:
   - Classify errors: retryable (5xx) vs fatal (4xx)
   - Exponential backoff with max 2 retries
   - Circuit breaker for repeated failures

5. **Hallucination**:
   - Require evidence-based reporting with citations
   - Claude must quote tool outputs verbatim
   - Never assert facts not in tool results

6. **State Drift**:
   - Server owns authoritative conversation state
   - Client's last-N is only a latency optimization hint
   - Versioned transcript management

## Critical Implementation Requirements (from GPT-5)

### Evidence-Based Reporting
```typescript
interface StructuredResponse {
  plan: string[]           // Steps Claude will take
  evidence: Evidence[]      // Actual tool results with IDs
  summary: string          // User-facing message
  citations: Citation[]    // [tool:id] references
  confidence: number       // 0-1 confidence score
}
```

### Loop Termination Criteria
1. Iteration limit reached (3-5)
2. Time limit exceeded (20-30s)
3. No new evidence for 2 iterations
4. Tool plan unchanged for 2 iterations
5. Confidence threshold met
6. User cancellation

### Error Taxonomy
```typescript
enum ErrorType {
  RETRYABLE_NETWORK = "5xx or timeout",
  VALIDATION_ERROR = "4xx - no retry",
  TOOL_NOT_FOUND = "fatal - abort",
  PERMISSION_DENIED = "fatal - abort",
  RATE_LIMITED = "backoff and retry"
}
```

## Consultation Notes

### Gemini Pro Review

**Key Recommendations**:
1. **Clarify Architecture**: Start with client-authoritative history (stateless server) for MVP
2. **Add run_id Immediately**: Generate unique ID per request for debugging from day one
3. **Stream Responses**: Use ReadableStream API to show progress in real-time
4. **Idempotency Critical**: Add requestId to prevent duplicate operations
5. **Tool Output Delimiters**: Wrap tool outputs in XML tags to prevent prompt injection

**Implementation Priorities**:
- Iteration limits and timeouts are non-negotiable (Phase 1)
- Use nanoid() for run_id generation
- Stream thoughts/actions as they happen for better UX
- Client generates requestId UUID for each user message

### GPT-5 Review (8/10 Confidence)

**Verdict**: Technically feasible with strong user value, but requires strict guardrails to avoid cost/runaway loops and hallucinated reporting.

**Key Recommendations**:
1. **Server Authority**: Server must own conversation truth, not client
2. **Token Budgets**: Compute server-side, use summaries when over limit
3. **Evidence Grounding**: Require tool output citations for all claims
4. **Observability**: Trace every iteration with run_id for debugging
5. **Phased Rollout**: Start with deterministic chains before full agentic loop

**Critical Gaps Identified**:
- Missing PII/privacy handling
- No idempotency for side-effecting tools
- Lack of dry-run/preview mode
- No prompt injection protection from tool outputs
- Missing observability/tracing infrastructure

### Revised Implementation Approach

Based on consultation, prioritize:

1. **MVP Phase (Week 1)**:
   - Basic memory with last 5 messages
   - Single tool execution with result inspection
   - Evidence-based responses

2. **Enhanced Phase (Week 2)**:
   - Multi-tool loop with 3 iteration limit
   - Error classification and retries
   - Token budget management

3. **Production Phase (Week 3-4)**:
   - Server-side state management
   - Observability and tracing
   - Idempotency and preview modes
   - Performance optimization

<!-- we said no time sizes. Also how come no Gem Pro consultation? -->