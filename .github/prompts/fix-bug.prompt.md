---
mode: 'agent'
description: 'Systematic debugging workflow for reproducing, diagnosing, and fixing bugs'
lastReviewed: 2026-05-08
---

# Bug Fix Workflow

## Agent Contract

### Scope
Reproducing, diagnosing, and fixing a specific defect anywhere in the monorepo, plus the regression test that proves it. Does not cover feature work, opportunistic refactoring, or dependency upgrades.

### Required Inputs
- The bug report or failing behavior, with enough detail to reproduce it.
- The affected source file(s) and their colocated tests.
- Recent history for those files (`git log --oneline -10 -- <file>`).
- The relevant RFC when the fix touches architecture — see `.github/agent-governance/rfc-grounding-protocol.md`.

### Execution Constraints
- Reproduce before fixing. A fix without a reproduction is a guess.
- Fix the root cause, not the symptom; keep the change minimal and surgical.
- Do not refactor while fixing — unrelated cleanup belongs in its own change.
- The regression test must fail without the fix and pass with it. Verify both directions.
- Never weaken, skip, or delete an existing assertion to make a suite green.

### Validation
```bash
# Frontend — routine, cheap
npm run test:unit
npm run build:website

# Backend
dotnet test sites/api.arolariu.ro/tests
dotnet build sites/api.arolariu.ro/src/Core
```
Reserve `npm run lint` and `npm run test:website` for a final pre-PR pass; both are expensive and are not routine verification.

### Escalation Conditions
Stop and ask the user before proceeding when the root cause sits in authentication/authorization, infrastructure, or a database schema; when the correct fix would change public behavior or an API contract; or when the bug turns out to be intended behavior that someone relies on.

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
- Backend: MSTest with AAA pattern

### 5. Verify
```bash
# Frontend — routine, cheap
npm run test:unit
npm run build:website

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
