# SPIDER Protocol

## Prerequisites

**Required for Multi-Agent Consultation**:
- Zen MCP server must be installed and running
- Check with: `mcp list` or test with `mcp__zen__version`
- If not available:
  - Option 1: "Would you like help installing Zen MCP server?"
  - Option 2: "Use spider-solo protocol instead (no multi-agent consultation)"

## Protocol Configuration

### Multi-Agent Consultation (ENABLED BY DEFAULT)

**DEFAULT BEHAVIOR:**
Multi-agent consultation is **ENABLED BY DEFAULT** when using SPIDER protocol.

**DEFAULT AGENTS:**
- **GPT-5**: Primary reviewer for architecture, feasibility, and code quality
- **Gemini Pro**: Secondary reviewer for completeness, edge cases, and alternative approaches

**DISABLING CONSULTATION:**
For single-agent workflow, use the spider-solo protocol instead.

**CUSTOM AGENTS:**
The user can specify different agents by saying: "use SPIDER with consultation from [agent1] and [agent2]"

**CONSULTATION BEHAVIOR:**
- DEFAULT: MANDATORY consultation with GPT-5 and Gemini Pro at EVERY checkpoint
- When explicitly disabled: Skip all consultation steps
- The protocol is BLOCKED until all required consultations are complete

**Consultation Checkpoints**:
- **Specification**: After initial draft, after human comments
- **Planning**: After initial plan, after human review
- **Implementation**: After code implementation
- **Defending**: After test creation
- **Evaluation**: Before marking phase complete
- **Review**: After review document

## Overview
SPIDER is a structured development protocol that emphasizes specification-driven development with iterative implementation and continuous review. It builds upon the DAPPER methodology with a focus on context-first development and multi-agent collaboration.

**Core Principle**: Each feature is tracked through exactly THREE documents - a specification, a plan, and a lessons-learned summary - all sharing the same filename and sequential identifier.

## When to Use SPIDER

### Use SPIDER for:
- New feature development
- Architecture changes
- Complex refactoring
- System design decisions
- API design and implementation
- Performance optimization initiatives

### Skip SPIDER for:
- Simple bug fixes (< 10 lines)
- Documentation updates
- Configuration changes
- Dependency updates
- Emergency hotfixes (but do a lightweight retrospective after)

## Protocol Phases

### S - Specify (Collaborative Design Exploration)

**Purpose**: Thoroughly explore the problem space and solution options before committing to an approach.

**Workflow Overview**:
1. User provides a prompt describing what they want built
2. Agent generates initial specification document
3. **COMMIT**: "Initial specification draft"
4. Multi-agent review (GPT-5 and Gemini Pro)
5. Agent updates spec with multi-agent feedback
6. **COMMIT**: "Specification with multi-agent review"
7. Human reviews and provides comments for changes
8. Agent makes changes and lists what was modified
9. **COMMIT**: "Specification with user feedback"
10. Multi-agent review of updated document
11. Final updates based on second review
12. **COMMIT**: "Final approved specification"
13. Iterate steps 7-12 until user approves and says to proceed to planning

**Important**: Keep documentation minimal - use only THREE core files with the same name:
- `specs/####-descriptive-name.md` - The specification
- `plans/####-descriptive-name.md` - The implementation plan
- `lessons/####-descriptive-name.md` - Lessons learned (created during Review phase)

**Process**:
1. **Clarifying Questions** (ALWAYS START HERE)
   - Ask the user/stakeholder questions to understand the problem
   - Probe for hidden requirements and constraints
   - Understand the business context and goals
   - Identify what's in scope and out of scope
   - Continue asking until the problem is crystal clear

2. **Problem Analysis**
   - Clearly articulate the problem being solved
   - Identify stakeholders and their needs
   - Document current state and desired state
   - List assumptions and constraints

3. **Solution Exploration**
   - Generate multiple solution approaches (as many as appropriate)
   - For each approach, document:
     - Technical design
     - Trade-offs (pros/cons)
     - Estimated complexity
     - Risk assessment

4. **Open Questions**
   - List all uncertainties that need resolution
   - Categorize as:
     - Critical (blocks progress)
     - Important (affects design)
     - Nice-to-know (optimization)

5. **Success Criteria**
   - Define measurable acceptance criteria
   - Include performance requirements
   - Specify quality metrics
   - Document test scenarios

6. **Expert Consultation (DEFAULT - MANDATORY)**
   - **First Consultation** (after initial draft):
     - MUST consult GPT-5 AND Gemini Pro
     - Focus: Problem clarity, solution completeness, missing requirements
     - Update specification with ALL feedback from both models
     - Document changes in "Consultation Log" section of the spec
   - **Second Consultation** (after human comments):
     - MUST consult GPT-5 AND Gemini Pro again
     - Focus: Validate changes, ensure alignment
     - Final specification update with both models' input
     - Update "Consultation Log" with new feedback

   **Note**: Only skip if user explicitly requested "without multi-agent consultation"

**⚠️ BLOCKING**: Cannot proceed without BOTH consultations (unless explicitly disabled)

**Output**: Single specification document in `codev/specs/####-descriptive-name.md`
- All consultation feedback incorporated directly into this document
- Include a "Consultation Log" section summarizing key feedback and changes
- Version control captures evolution through commits
**Template**: `templates/spec.md`
**Review Required**: Yes - Human approval AFTER consultations

### P - Plan (Structured Decomposition)

**Purpose**: Transform the approved specification into an executable roadmap with clear phases.

**Workflow Overview**:
1. Agent creates initial plan document
2. **COMMIT**: "Initial plan draft"
3. Multi-agent review (GPT-5 and Gemini Pro)
4. Agent updates plan with multi-agent feedback
5. **COMMIT**: "Plan with multi-agent review"
6. User reviews and requests modifications
7. Agent updates plan based on user feedback
8. **COMMIT**: "Plan with user feedback"
9. Multi-agent review of updated plan
10. Final updates based on second review
11. **COMMIT**: "Final approved plan"
12. Iterate steps 6-11 until agreement is reached

**Phase Design Goals**:
Each phase should be:
- A separate piece of work that can be checked in as a unit
- A complete set of functionality
- Self-contained and independently valuable

**Process**:
1. **Phase Definition**
   - Break work into logical phases
   - Each phase must:
     - Have a clear, single objective
     - Be independently testable
     - Deliver observable value
     - Be a complete unit that can be committed
     - End with evaluation discussion and single commit
   - Note dependencies inline, for example:
     ```markdown
     Phase 2: API Endpoints
     - Depends on: Phase 1 (Database Schema)
     - Objective: Create /users and /todos endpoints
     - Evaluation: Test coverage, API design review, performance check
     - Commit: Will create single commit after user approval
     ```

2. **Success Metrics**
   - Define "done" for each phase
   - Include test coverage requirements
   - Specify performance benchmarks
   - Document acceptance tests

3. **Expert Review (DEFAULT - MANDATORY)**
   - **First Consultation** (after plan creation):
     - MUST consult GPT-5 AND Gemini Pro
     - Focus: Feasibility, phase breakdown, completeness
     - Update plan with ALL feedback from both models
   - **Second Consultation** (after human review):
     - MUST consult GPT-5 AND Gemini Pro again
     - Focus: Validate adjustments, confirm approach
     - Final plan refinement with both models' input

   **Note**: Only skip if user explicitly requested "without multi-agent consultation"

**⚠️ BLOCKING**: Cannot proceed without BOTH consultations (unless explicitly disabled)

**Output**: Single plan document in `codev/plans/####-descriptive-name.md`
- Same filename as specification, different directory
- All consultation feedback incorporated directly
- Include phase status tracking within this document
- Version control captures evolution through commits
- **DO NOT include time estimates** - Focus on deliverables and dependencies, not hours/days
**Template**: `templates/plan.md`
**Review Required**: Yes - Technical lead approval AFTER consultations

### (IDE) - Implementation Loop

Execute for each phase in the plan. This is a strict cycle that must be completed in order.

**CRITICAL PRECONDITION**: Before starting any phase, verify the previous phase was committed to git. No phase can begin without the prior phase's commit.

**⚠️ MANDATORY ENFORCEMENT - PROTOCOL VIOLATION = IMMEDIATE STOP**:
- The I-D-E cycle MUST be completed IN FULL for EACH PHASE
- Skipping D (Defend) or E (Evaluate) for ANY phase is a PROTOCOL VIOLATION
- If you realize you skipped D or E, you MUST:
  1. STOP immediately
  2. Go back and complete the missing step(s)
  3. Get multi-agent review
  4. Only then continue

**Phase Completion Checklist (ALL REQUIRED)**:
- [ ] **Implement** - Code written and working
- [ ] **Defend** - Tests written and passing
- [ ] **Evaluate** - Multi-agent review (GPT-5 + Gemini Pro) completed
- [ ] **Commit** - Single atomic commit created
- [ ] **TodoWrite** - Phase marked as completed in todo list

**Phase Completion Process**:
1. **Implement** - Build the code for this phase
2. **Defend** - Write comprehensive tests IMMEDIATELY (not retroactively)
3. **Evaluate** - Get multi-agent review and user assessment
4. **Commit** - Single atomic commit for the phase (MANDATORY before next phase)
5. **Proceed** - Move to next phase only after commit

**Handling Failures**:
- If **Defend** phase reveals gaps → return to **Implement** to fix
- If **Evaluation** reveals unmet criteria → return to **Implement**
- If user requests changes → return to **Implement**
- If fundamental plan flaws found → mark phase as `blocked` and revise plan

**Commit Requirements**:
- Each phase MUST end with a git commit before proceeding
- Commit message format: `[Spec ####][Phase: name] type: Description`
- No work on the next phase until current phase is committed
- If changes are needed after commit, create a new commit with fixes

#### I - Implement (Build with Discipline)

**Purpose**: Transform the plan into working code with high quality standards.

**Precondition**: Previous phase must be committed (verify with `git log`)

**Requirements**:
1. **Pre-Implementation**
   - Verify previous phase is committed to git
   - Review the phase plan and success criteria
   - Set up the development environment
   - Create feature branch following naming convention
   - Document any plan deviations immediately

2. **During Implementation**
   - Write self-documenting code
   - Follow project style guide strictly
   - Implement incrementally with frequent commits
   - Each commit must:
     - Be atomic (single logical change)
     - Include descriptive message
     - Reference the phase
     - Pass basic syntax checks

3. **Code Quality Standards**
   - No commented-out code
   - No debug prints in final code
   - Handle all error cases explicitly
   - Include necessary logging
   - Follow security best practices

4. **Documentation Requirements**
   - Update API documentation
   - Add inline comments for complex logic
   - Update README if needed
   - Document configuration changes

**Evidence Required**:
- Link to commits
- Code review approval (if applicable)
- No linting errors
- CI pipeline pass link (build/test/lint)

**Expert Consultation (DEFAULT - MANDATORY)**:
- MUST consult BOTH GPT-5 AND Gemini Pro after implementation
- Focus: Code quality, patterns, security, best practices
- Update code based on feedback from BOTH models before proceeding
- Only skip if user explicitly disabled multi-agent consultation

#### D - Defend (Write Comprehensive Tests)

**Purpose**: Create comprehensive automated tests that safeguard intended behavior and prevent regressions.

**CRITICAL**: Tests must be written IMMEDIATELY after implementation, NOT retroactively at the end of all phases. This is MANDATORY.

**Requirements**:
1. **Defensive Test Creation**
   - Write unit tests for all new functions
   - Tests must be written ALONGSIDE implementation, not after
   - Create integration tests for feature flows
   - Develop edge case coverage
   - Build error condition tests
   - Establish performance benchmarks

2. **Test Validation** (ALL MANDATORY)
   - All new tests must pass
   - All existing tests must pass
   - No reduction in overall coverage
   - Performance benchmarks met
   - Security scans pass
   - **Avoid Overmocking**:
     - Test behavior, not implementation details
     - Prefer integration tests over unit tests with heavy mocking
     - Only mock external dependencies (APIs, databases, file systems)
     - Never mock the system under test itself
     - Use real implementations for internal module boundaries

3. **Test Suite Documentation**
   - Document test scenarios
   - Explain complex test setups
   - Note any flaky tests
   - Record performance baselines

**Evidence Required**:
- Test execution logs
- Coverage report (show no reduction)
- Performance test results (if applicable per spec)
- Security scan results (if configured)
- CI test run link with artifacts

**Expert Consultation (DEFAULT - MANDATORY)**:
- MUST consult BOTH GPT-5 AND Gemini Pro for test defense review
- Focus: Test coverage completeness, edge cases, defensive patterns, test strategy
- Write additional defensive tests based on feedback from BOTH models
- Share their feedback during the Evaluation discussion
- Only skip if user explicitly disabled multi-agent consultation

#### E - Evaluate (Assess Objectively)

**Purpose**: Verify the implementation fully satisfies the phase requirements and maintains system quality. This is where the critical discussion happens before committing the phase.

**Requirements**:
1. **Functional Evaluation**
   - All acceptance criteria met
   - User scenarios work as expected
   - Edge cases handled properly
   - Error messages are helpful

2. **Non-Functional Evaluation**
   - Performance requirements satisfied
   - Security standards maintained
   - Code maintainability assessed
   - Technical debt documented

3. **Deviation Analysis**
   - Document any changes from plan
   - Explain reasoning for changes
   - Assess impact on other phases
   - Update future phases if needed
   - **Overmocking Check** (MANDATORY):
     - Verify tests focus on behavior, not implementation
     - Ensure at least one integration test per critical path
     - Check that internal module boundaries use real implementations
     - Confirm mocks are only used for external dependencies
     - Tests should survive refactoring that preserves behavior

4. **Expert Consultation Before User Evaluation** (MANDATORY - NO EXCEPTIONS)
   - Get initial feedback from experts
   - Make ALL necessary fixes based on feedback
   - **CRITICAL**: Get FINAL approval from ALL consulted experts on the FIXED version
   - Only proceed to user evaluation after ALL experts approve
   - If any expert says "not quite" or has concerns, fix them FIRST

5. **Evaluation Discussion with User** (ONLY AFTER EXPERT APPROVAL)
   - Present to user: "Phase X complete. Here's what was built: [summary]"
   - Share test results and coverage metrics
   - Share that ALL experts have given final approval
   - Ask: "Any changes needed before I commit this phase?"
   - Incorporate user feedback if requested
   - Get explicit approval to proceed

6. **Phase Commit** (MANDATORY - NO EXCEPTIONS)
   - Create single atomic commit for the entire phase
   - Commit message: `[Spec ####][Phase: name] type: Description`
   - Update the plan document marking this phase as complete
   - Push all changes to version control
   - Document any deviations or decisions in the plan
   - **CRITICAL**: Next phase CANNOT begin until this commit is complete
   - Verify commit with `git log` before proceeding

7. **Final Verification**
   - Confirm all expert feedback was addressed
   - Verify all tests pass
   - Check that documentation is updated
   - Ensure no outstanding concerns from experts or user

**Evidence Required**:
- Evaluation checklist completed
- Test results and coverage report
- Expert review notes from GPT-5 and Gemini Pro
- User approval from evaluation discussion
- Updated plan document with:
  - Phase marked complete
  - Evaluation discussion summary
  - Any deviations noted
- Git commit for this phase
- Final CI run link after all fixes

### R - Review/Refine/Revise (Continuous Improvement)

**Purpose**: Ensure overall coherence, capture learnings, improve the methodology, and perform systematic review.

**Precondition**: All implementation phases must be committed (verify with `git log --oneline | grep "\[Phase"`)

**Process**:
1. **Comprehensive Review**
   - Verify all phases have been committed to git
   - Compare final implementation to original specification
   - Assess overall architecture impact
   - Review code quality across all changes
   - Validate documentation completeness

2. **Refinement Actions**
   - Refactor code for clarity if needed
   - Optimize performance bottlenecks
   - Improve test coverage gaps
   - Enhance documentation

3. **Revision Requirements** (MANDATORY)
   - Update README.md with any new features or changes
   - Update CLAUDE.md with protocol improvements from lessons learned
   - Update specification and plan documents with final status
   - Revise architectural diagrams if needed
   - Update API documentation
   - Modify deployment guides as necessary
   - **CRITICAL**: Update this protocol document based on lessons learned

4. **Systematic Issue Review** (MANDATORY)
   - Review entire project for systematic issues:
     - Repeated problems across phases
     - Process bottlenecks or inefficiencies
     - Missing documentation patterns
     - Technical debt accumulation
     - Testing gaps or quality issues
   - Document systematic findings in lessons learned
   - Create action items for addressing systematic issues

5. **Lessons Learned** (MANDATORY)
   - What went well?
   - What was challenging?
   - What would you do differently?
   - What methodology improvements are needed?
   - What systematic issues were identified?

6. **Methodology Evolution**
   - Propose process improvements based on lessons
   - Update protocol documents with improvements
   - Update templates if needed
   - Share learnings with team
   - Document in `codev/reviews/`
   - **Important**: This protocol should evolve based on each project's learnings

**Output**:
- Single review document in `codev/reviews/####-descriptive-name.md`
- Same filename as spec/plan, captures all learnings and review from this feature
- Methodology improvement proposals (update protocol if needed)

**Review Required**: Yes - Team retrospective recommended

## File Naming Conventions

### Specifications and Plans
Format: `####-descriptive-name.md`
- Use sequential numbering (0001, 0002, etc.)
- Same filename in both `specs/` and `plans/` directories
- Example: `0001-user-authentication.md`

## Status Tracking

Status is tracked at the **phase level** within plan documents, not at the document level.

Each phase in a plan should have a status:
- `pending`: Not started
- `in-progress`: Currently being worked on
- `completed`: Phase finished and tested
- `blocked`: Cannot proceed due to external factors

## Git Integration

### Commit Message Format

For specification/plan documents:
```
[Spec ####] <stage>: <description>
```

Examples:
```
[Spec 0001] Initial specification draft
[Spec 0001] Specification with multi-agent review
[Spec 0001] Specification with user feedback
[Spec 0001] Final approved specification
```

For implementation:
```
[Spec ####][Phase: <phase-name>] <type>: <description>

<optional detailed description>
```

Example:
```
[Spec 0001][Phase: user-auth] feat: Add password hashing service

Implements bcrypt-based password hashing with configurable rounds
```

### Branch Naming
```
spider/####-<spec-name>/<phase-name>
```

Example:
```
spider/0001-user-authentication/database-schema
```


## Best Practices

### During Specification
- Use clear, unambiguous language
- Include concrete examples
- Define measurable success criteria
- Link to relevant references

### During Planning
- Keep phases small and focused
- Ensure each phase delivers value
- Note phase dependencies inline (no formal dependency mapping needed)
- Include rollback strategies

### During Implementation
- Follow the plan but document deviations
- Maintain test coverage
- Keep commits atomic and well-described
- Update documentation as you go

### During Review
- Check against original specification
- Document lessons learned
- Propose methodology improvements
- Update estimates for future work

## Templates

Templates for each phase are available in the `templates/` directory:
- `spec.md` - Specification template
- `plan.md` - Planning template (includes phase status tracking)
- `review.md` - Review and lessons learned template

**Remember**: Only create THREE documents per feature - spec, plan, and review with the same filename in different directories.

## Protocol Evolution

This protocol can be customized per project:
1. Fork the protocol directory
2. Modify templates and processes
3. Document changes in `protocol-changes.md`
4. Share improvements back to the community

## Lessons Learned from Implementation

### Critical Success Factors (Added 2025-01-22)

Based on implementation of Spec 0002 (Conversational Interface Improvements):

#### 1. Git Discipline is Non-Negotiable
- **NEVER** use `git add -A`, `git add --all`, or `git add .`
- **ALWAYS** stage files individually with `git add <specific-file>`
- **WHY**: Prevents accidental commits of sensitive files, temp files, or unwanted changes
- **ENFORCEMENT**: Consider pre-commit hooks to block bulk staging commands

#### 2. Multi-Agent Consultation Error Handling
- **ISSUE**: Models may fail to access files or encounter API errors
- **SOLUTION**: Proceed with available models rather than blocking entirely
- **BEST PRACTICE**: Always attempt both models but accept single model feedback if necessary

#### 3. Testing Strategy for External Dependencies
- **ISSUE**: Deep mocking of external SDKs (e.g., Anthropic, MCP) creates brittle tests
- **SOLUTION**:
  - Use integration tests with real test servers where possible
  - Create wrapper interfaces for external SDKs
  - Focus unit tests on business logic, not SDK interaction
- **EXAMPLE**: TodoFormatter tests focused on formatting logic, not API mocking

#### 4. Streaming Implementation Best Practices
- **CHOICE**: Server-Sent Events (SSE) superior to WebSockets for server-to-client streaming
- **REQUIREMENTS**:
  - Heartbeat messages every 15-30 seconds
  - Support for Last-Event-ID for reconnection
  - Disable proxy buffering (X-Accel-Buffering: no)
  - Handle backpressure with stream.write() return values
- **TESTING**: Must include forced disconnection and reconnection scenarios

#### 5. Evidence-Based Response Architecture
- **PATTERN**: Separate formatting logic from execution logic
- **IMPLEMENTATION**: TodoFormatter utility class with `_formatted` field
- **BENEFIT**: Prevents LLM hallucinations by providing pre-formatted, accurate data
- **TESTING**: Comprehensive tests for all formatting scenarios

#### 6. Phase Completion Verification
- **REQUIREMENT**: Each phase MUST be committed before starting next phase
- **VERIFICATION**: Use `git log --oneline | grep "Phase"` to confirm
- **RATIONALE**: Ensures clean rollback points and prevents work overlap

#### 7. Documentation Timing
- **OLD**: Update documentation after implementation
- **NEW**: Update documentation DURING implementation
- **SPECIFICALLY**:
  - Update README.md with new endpoints immediately after creation
  - Document API changes in same commit as implementation
  - Keep CLAUDE.md current with process learnings

#### 8. Production Hardening Checklist
Based on expert review (GPT-5: 8/10, Gemini Pro: 9/10):

**SSE Reliability**:
- [ ] Heartbeat comments every 15-30s
- [ ] Retry hints in SSE messages
- [ ] Support Last-Event-ID for reconnection
- [ ] Disable proxy buffering and compression

**Observability**:
- [ ] OpenTelemetry spans for each operation
- [ ] Correlation IDs across all logs
- [ ] Metrics for tool latency, retries, cancellations
- [ ] Error taxonomy with user-safe messages

**Tool Governance**:
- [ ] Idempotency keys for tool operations
- [ ] Side-effect classification (read vs write)
- [ ] Circuit breakers for failing tools
- [ ] Per-tool timeout configuration

**Memory Management**:
- [ ] Sliding window limits
- [ ] Auto-summarization for long conversations
- [ ] PII redaction capabilities
- [ ] Configurable retention/TTL

### Common Pitfalls to Avoid

1. **Skipping Defend Phase**: Always write tests immediately, not retroactively
2. **Incomplete Evaluation**: Get expert approval BEFORE user review
3. **Bulk Git Operations**: Never use commands that stage all files
4. **Over-mocking**: Create integration tests instead of complex mocks
5. **Missing Timeouts**: Always implement AbortController with proper cleanup
6. **Ignoring Backpressure**: Check stream.write() returns in SSE implementations

### Recommended Tools and Patterns

1. **Streaming**: Server-Sent Events (SSE) for server-to-client
2. **Cancellation**: AbortController with signal propagation
3. **Formatting**: Dedicated utility classes (e.g., TodoFormatter)
4. **Validation**: Zod for runtime type checking
5. **Testing**: Vitest with focus on integration over unit tests
6. **Documentation**: Inline updates during implementation