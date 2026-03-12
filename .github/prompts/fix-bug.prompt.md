---
mode: 'agent'
description: 'Systematic debugging workflow for reproducing, diagnosing, and fixing bugs'
---

# Bug Fix Workflow

## Execution Contract

1. **Reproduce** — Confirm the bug exists with evidence (test, command output, or behavior observation)
2. **Diagnose** — Identify root cause by tracing through the relevant code path
3. **Fix** — Apply the minimal, surgical fix that addresses the root cause
4. **Test** — Write a regression test that would have caught this bug
5. **Verify** — Run existing tests to ensure no regressions

## Steps

### 1. Reproduce
- Read the bug description or user report
- Identify the affected component/service/endpoint
- Write a failing test or reproduce via command

### 2. Diagnose
- Trace the code path from the entry point (endpoint/page/component)
- Check recent changes to the affected files (`git log --oneline -10 -- <file>`)
- Look for common causes: null handling, async race conditions, type mismatches

### 3. Fix
- Apply the minimal change that fixes the root cause
- Follow existing patterns — don't refactor while fixing
- If the fix touches architecture, consult the relevant RFC first

### 4. Test
- Write a test named `MethodOrComponent_BugCondition_ExpectedBehavior`
- The test MUST fail without the fix and pass with it
- Frontend: Vitest + Testing Library
- Backend: xUnit with AAA pattern

### 5. Verify
```bash
# Frontend
npm run test:website
npm run lint

# Backend
dotnet test sites/api.arolariu.ro/tests
dotnet build sites/api.arolariu.ro/src/Core
```

## Checklist
- [ ] Bug reproduced with evidence
- [ ] Root cause identified (not just symptom)
- [ ] Fix is minimal and follows existing patterns
- [ ] Regression test written
- [ ] All existing tests pass
- [ ] No lint errors introduced
