# Implementation Plan: Conversational Interface Improvements

## Feature: 0002-conversational-improvements
## Date: 2025-09-21
## Spec: codev/specs/0002-conversational-improvements.md

## Overview
Implementing memory, multi-tool execution, and agentic loop for the conversational interface based on the approved hybrid approach from the specification.

## Library Evaluation

### Memory Management Options

#### Option 1: LangChain Memory (Recommended)
- **Pros**: Battle-tested, built-in conversation types, MCP adapter available (langchain-mcp-adapters)
- **Packages**: `@langchain/core` + `langchain-mcp-adapters`
- **Memory Types**: ConversationBufferMemory, ConversationSummaryMemory, ConversationWindowMemory
- **Integration**: Works with our existing MCP setup via official adapter

#### Option 2: Vercel AI SDK
- **Pros**: Built for Next.js, streaming support, conversation management
- **Package**: `ai` (Vercel AI SDK)
- **Features**: Built-in conversation state, streaming, error handling
- **Cons**: Would require rewriting our MCP integration

#### Option 3: Custom Memory Implementation
- **Pros**: Full control, smaller bundle size, no new dependencies
- **Cons**: More code to maintain, reinventing established patterns
- **Approach**: Store in React state + localStorage fallback

**Decision**: Start with Option 3 (custom) to avoid dependency complexity, evaluate LangChain if we need advanced features like conversation summarization.

## Phase 1: Basic Memory Implementation

### 1.1 Update API Contract
- [ ] Modify ChatRequest interface to include conversation history
- [ ] Add requestId for idempotency (nanoid)
- [ ] Add run_id generation for debugging/tracing
- [ ] Update response to include actions taken

### 1.2 Frontend Memory Management
- [ ] Store full conversation history in React state
- [ ] Send entire conversation with each request (no truncation initially)
- [ ] Add unique requestId generation per message
- [ ] Update message interface to store tool actions

### 1.3 Backend Context Processing
- [ ] Parse conversation history from request
- [ ] Format history into Claude messages format
- [ ] Include conversation context in system prompt
- [ ] Add proper role alternation (user/assistant)

### 1.4 Testing Memory
- [ ] Test: "Create a grocery todo" → "Show me all todos"
- [ ] Test: "Create buy milk todo" → "Mark it as complete" (pronoun reference)
- [ ] Test: Previous context retained across messages
- [ ] Write automated tests for memory retention

## Phase 2: Tool Result Inspection

### 2.1 Enhanced Tool Result Processing
- [ ] Parse tool results to extract actual data
- [ ] Format todo items in readable structure
- [ ] Capture error messages from failed tools
- [ ] Store tool results with message history

### 2.2 Evidence-Based Responses
- [ ] Update system prompt to require citing tool outputs
- [ ] Format responses to include actual todo content
- [ ] Show before/after states for updates
- [ ] Never allow generic confirmations without data

### 2.3 Result Formatting
- [ ] Create TodoFormatter utility class
- [ ] Format lists with proper structure (title, status, priority)
- [ ] Include counts and summaries
- [ ] Add completion timestamps when relevant

### 2.4 Testing Result Quality
- [ ] Test: Response includes actual todo titles
- [ ] Test: Updates show what changed
- [ ] Test: Lists show current state accurately
- [ ] Write tests for formatter utility

## Phase 3: Multi-Tool Execution Loop

### 3.1 Agentic Loop Implementation
```typescript
// Core loop structure
interface AgenticState {
  iterations: number
  maxIterations: 3  // Start conservative
  toolsExecuted: ToolExecution[]
  needsMoreActions: boolean
  confidence: number
}
```

### 3.2 Loop Control Logic
- [ ] Implement iteration counter with hard limit (3)
- [ ] Add timeout mechanism (20 seconds)
- [ ] Track tools executed to prevent duplicates
- [ ] Implement completion evaluation after each tool

### 3.3 Multi-Step Reasoning
- [ ] Allow Claude to chain operations
- [ ] Support conditional logic (if X then Y)
- [ ] Enable follow-up queries based on results
- [ ] Add explicit planning step before execution

### 3.4 Error Handling
- [ ] Classify errors (retryable vs fatal)
- [ ] Implement exponential backoff for retries
- [ ] Fail gracefully with partial results
- [ ] Clear error messages to user

### 3.5 Testing Multi-Tool
- [ ] Test: "Create grocery todo and show all todos"
- [ ] Test: "Create 3 todos then mark the first complete"
- [ ] Test: Iteration limit enforcement
- [ ] Test: Timeout handling
- [ ] Write integration tests for loop

## Phase 4: UI Improvements

### 4.1 Loading States
- [ ] Add "thinking" indicator during processing
- [ ] Show step counter (1 of 3) for multi-step operations
- [ ] Display current action being performed
- [ ] Support cancellation mid-operation

### 4.2 Auto-Scrolling
- [ ] Auto-scroll to bottom on new messages
- [ ] Maintain position when user scrolls up
- [ ] Smooth scroll animation
- [ ] Test on mobile viewports

### 4.3 Message Formatting
- [ ] Show tool actions in collapsible sections
- [ ] Format todo lists with checkboxes in chat
- [ ] Add timestamps to messages
- [ ] Color-code assistant vs user messages

### 4.4 Error Display
- [ ] User-friendly error messages
- [ ] Retry buttons for failed operations
- [ ] Clear indication of partial success
- [ ] Debug info in expandable section

## Phase 5: Observability & Safety

### 5.1 Logging Infrastructure
- [ ] Add run_id to all log entries
- [ ] Log each iteration with context
- [ ] Track token usage per request
- [ ] Store timing metrics

### 5.2 Safety Mechanisms
- [ ] Token budget calculation (8k limit)
- [ ] Prevent infinite loops (hard stops)
- [ ] Rate limiting on frontend (10 req/min)
- [ ] Duplicate request prevention

### 5.3 Monitoring
- [ ] Track success/failure rates
- [ ] Monitor iteration distributions
- [ ] Alert on timeout frequency
- [ ] Log unusual patterns

## Implementation Sequence

### Phase Dependencies
- Phase 1 (Memory) blocks all others - foundation requirement
- Phase 2 (Result Inspection) depends on Phase 1
- Phase 3 (Multi-Tool) depends on Phases 1-2
- Phase 4 (UI) can partially parallel with Phase 3
- Phase 5 (Observability) should start early, complete last

### Priority Order
1. **Critical Path**: Phase 1 → Phase 2 → Phase 3
2. **Enhancement Path**: Phase 4 (UI polish)
3. **Production Path**: Phase 5 (monitoring/safety)

## Success Metrics

### Functional Requirements
- [ ] Memory works across conversation
- [ ] Multi-step requests execute correctly
- [ ] Responses include actual data
- [ ] No infinite loops or runaways

### Performance Requirements
- [ ] 95% of requests complete < 10s
- [ ] No requests exceed 30s timeout
- [ ] Token usage < 8k per request
- [ ] Frontend remains responsive

### Quality Requirements
- [ ] No hallucinated todo content
- [ ] Clear error messages
- [ ] Graceful degradation
- [ ] Audit trail via run_id

## Testing Strategy

### Unit Tests
- Memory management functions
- Tool result parsing
- Formatter utilities
- Loop control logic

### Integration Tests
- End-to-end conversation flows
- Multi-tool execution chains
- Error recovery scenarios
- Timeout handling

### Manual Testing Scenarios
1. "Create a todo" → "Show it" → "Mark it complete"
2. "Create 3 todos about groceries" → "Show todos" → "Delete the milk one"
3. "What todos do I have?" → "Complete the first one" → "Show remaining"
4. Error cases: network failures, tool errors, timeouts

## Risk Mitigation

### Token Limit Risks
- **Mitigation**: Calculate tokens server-side, truncate if needed
- **Fallback**: Sliding window with summary of older messages

### Infinite Loop Risks
- **Mitigation**: Hard iteration limit, timeout, no-progress detection
- **Fallback**: Return partial results with explanation

### Response Time Risks
- **Mitigation**: Stream responses, show progress, allow cancellation
- **Fallback**: Timeout with option to retry

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Client sends full history | Simpler than server sessions, works with serverless |
| 3 iteration limit initially | Conservative start, can increase after monitoring |
| Evidence-based responses | Prevents hallucination, builds trust |
| run_id from start | Critical for debugging production issues |
| No truncation initially | Avoid complexity, monitor token usage first |

## Definition of Done

Each phase is complete when:
1. Code implemented with tests
2. Tests passing (unit + integration)
3. Manual testing successful
4. Documentation updated
5. Code reviewed (can use multi-agent)
6. No critical bugs or security issues