# SPIDER Protocol Quick Reference Card

## Phase Execution Checklist

### 📥 PHASE ENTRY (Before Starting)
```bash
git log --oneline -5  # Verify previous phase commit
```
```
TodoWrite with 4 items:
✅ Phase N: Implement [feature] → in_progress
⬜ Phase N: Write tests → pending
⬜ Phase N: Get review → pending
⬜ Phase N: Commit → pending
```
Say: "Starting Phase N: [Description]"

### 💻 IMPLEMENT
- Build the feature
- Test manually
- Say: "Implementation done, switching to test mode"

### 🛡️ DEFEND
- Write comprehensive tests
- Run: `npm test -- [test-file]`
- Paste passing output

### 🔍 EVALUATE
- Get multi-agent review (2+ models)
- Address feedback
- Show review summary

### ✅ COMMIT
```bash
git add [specific files]
git commit -m "[Spec ####][Phase N] feat: [description]"
git log -1  # Show commit
```

### 📤 PHASE EXIT (Before Next Phase)
- All 4 TodoWrite items → completed
- Tests passing
- Review complete
- Commit created

## 🚨 STOP CONDITIONS
STOP if you:
- Have pending "Write tests" after implementing
- Have pending "Get review" after testing
- Think "I'll do it later"
- Don't see previous phase commit

## 🔄 VIOLATION RECOVERY
1. **STOP** - No more code
2. **LIST** - Which phases missing D or E
3. **FIX** - Write tests, get reviews
4. **VERIFY** - Show outputs
5. **UPDATE** - TodoWrite status
6. **DOCUMENT** - In lessons learned
7. **RESUME** - Only when complete

## 📚 Full Protocol
See: `codev/protocols/spider/protocol.md`