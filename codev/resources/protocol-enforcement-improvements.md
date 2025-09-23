# Proposed Protocol Enforcement Improvements

## Problem Analysis
The main violation was skipping the Defend and Evaluate steps for Phases 1-2 due to:
1. **Momentum bias** - Tendency to keep coding when "in the flow"
2. **Insufficient automatic enforcement** - Protocol relies on self-discipline
3. **Missing explicit blockers** - No hard stops between phases
4. **TodoWrite not mandatory** - Used optionally rather than required

## Proposed Changes to CLAUDE.md

### 1. Add Pre-Phase Verification Gate
```markdown
## SPIDER Phase Gate Requirements

### ⛔ PHASE GATE - MUST COMPLETE BEFORE STARTING ANY PHASE:
Before starting ANY implementation phase:
1. **Verify Previous Phase**: Check git log to confirm previous phase has I-D-E-C complete
2. **Create Phase Todos**: Use TodoWrite with EXACTLY these items:
   - "Phase N: Implement [feature]"
   - "Phase N: Write tests for [feature]"
   - "Phase N: Get multi-agent review"
   - "Phase N: Commit [feature]"
3. **Set Status**: Mark implementation as "in_progress" in TodoWrite
4. **State Intent**: Explicitly state "Starting Phase N: Implementation"

### 🚫 AUTOMATIC STOP CONDITIONS:
You MUST STOP IMMEDIATELY if:
- TodoWrite shows a pending "Write tests" task for current phase
- TodoWrite shows a pending "Get multi-agent review" task for current phase
- Git log doesn't show commit for previous phase
- You catch yourself thinking "I'll write tests later"
```

### 2. Add Explicit Phase Completion Verification
```markdown
## Phase Completion Verification

### ✅ PHASE COMPLETION CHECKLIST (USE EVERY TIME):
```
Phase N: [Feature Name]
- [ ] Implementation complete and working
- [ ] Tests written and all passing (show test output)
- [ ] Multi-agent review completed (paste review summary)
- [ ] All review feedback addressed
- [ ] Single atomic commit created
- [ ] TodoWrite updated to "completed" for all phase tasks
```

### ⚠️ SELF-CHECK QUESTIONS (ANSWER BEFORE MOVING ON):
1. Did I write tests DURING implementation (not after)?
2. Did I get review from at least 2 different models?
3. Can I show the test output proving tests pass?
4. Is there exactly ONE commit for this phase?
```

## Proposed Changes to protocol.md

### 1. Add Automatic Enforcement Section
```markdown
### Automatic Protocol Enforcement

#### TodoWrite Integration (MANDATORY)
The TodoWrite tool MUST be used as the primary enforcement mechanism:

1. **Phase Setup** (Required at phase start):
   ```
   todos = [
     {content: "Phase 1: Implement X", status: "in_progress"},
     {content: "Phase 1: Write tests for X", status: "pending"},
     {content: "Phase 1: Get multi-agent review", status: "pending"},
     {content: "Phase 1: Commit X", status: "pending"}
   ]
   ```

2. **Phase Progression Rules**:
   - Cannot mark "Implement" as complete until code works
   - Cannot mark "Write tests" as complete until tests pass
   - Cannot mark "Get review" as complete until review received
   - Cannot start Phase N+1 until all Phase N items are "completed"

3. **Violation Detection**:
   - System will remind if "Write tests" remains pending > 30 minutes
   - System will block new phase if previous phase incomplete
   - System will alert on attempts to commit without tests
```

### 2. Add Hard Stops Between Phases
```markdown
### Phase Transition Gates

#### HARD STOP - Phase Exit Criteria
Before exiting ANY phase, you MUST:

1. **Show Test Results**:
   ```bash
   npm run test -- [test-file]
   # MUST show passing tests before proceeding
   ```

2. **Show Review Summary**:
   ```
   Multi-Agent Review Summary:
   - Model 1: [Key feedback points]
   - Model 2: [Key feedback points]
   - Changes made: [List of changes based on feedback]
   ```

3. **Show Commit**:
   ```bash
   git log --oneline -1
   # MUST show single commit for this phase
   ```

#### HARD STOP - Phase Entry Criteria
Before entering ANY phase, you MUST:

1. **Verify Previous Phase**:
   ```bash
   git log --oneline -5
   # MUST see previous phase commit
   ```

2. **Check Todo Status**:
   ```
   TodoWrite must show all previous phase items as "completed"
   ```

3. **State Phase Intent**:
   ```
   "Starting Phase N: [Description]
   I-D-E-C tasks created in TodoWrite"
   ```
```

### 3. Add Recovery Protocol
```markdown
### Protocol Violation Recovery

#### Immediate Recovery Steps
If you realize you've skipped D or E:

1. **STOP** - Do not write any more code
2. **ASSESS** - List which phases are missing D or E
3. **BACKFILL** - For each incomplete phase:
   - Write comprehensive tests retroactively
   - Run tests and fix any failures
   - Get multi-agent review
   - Document findings
4. **UPDATE** - Update TodoWrite to reflect completion
5. **COMMIT** - Create amendment commits if needed
6. **DOCUMENT** - Add violation and recovery to lessons learned
7. **RESUME** - Only after ALL phases are complete

#### Violation Consequences
- Document violation in lessons learned
- Reduce protocol adherence score
- Require additional review for next phase
- Add extra verification steps
```

## Proposed Changes to Both Files

### Add Visual Phase Markers
```markdown
# ═══════════════════════════════════════════════════════════════
# PHASE 1: [Name] - STATUS: [Not Started|In Progress|Complete]
# ═══════════════════════════════════════════════════════════════

## ▶️ IMPLEMENT
[Implementation work]

## 🛡️ DEFEND
[Test writing]

## 🔍 EVALUATE
[Multi-agent review]

## ✅ COMMIT
[Git commit]

# ═══════════════════════════════════════════════════════════════
```

### Add Cognitive Breaks
```markdown
## 🧠 COGNITIVE BREAK REQUIRED
After completing each phase's Implementation step:
1. Take a 2-minute break (use a timer)
2. Come back and ask: "What's my next step?"
3. Check TodoWrite for "Write tests" task
4. Explicitly state: "Now writing tests for Phase N"
```

## Summary of Key Changes

1. **TodoWrite becomes MANDATORY** - Not optional tracking
2. **Hard stops between phases** - Must show evidence of completion
3. **Visual phase markers** - Clear separation between phases
4. **Cognitive breaks** - Prevent momentum from overriding protocol
5. **Automatic reminders** - System prompts for missing steps
6. **Recovery protocol** - Clear steps when violations detected
7. **Phase gates** - Entry and exit criteria that must be verified

These changes would make it nearly impossible to accidentally skip the Defend and Evaluate steps.