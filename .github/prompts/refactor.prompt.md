---
name: "refactor"
description: 'Guided refactoring following project patterns. Identifies code smells, plans changes, implements refactoring, and verifies test coverage is maintained.'
agent: 'agent'
model: 'Claude Sonnet 4.5'
tools: ['codebase', 'search', 'editFiles', 'terminalLastCommand']
---

# Guided Refactoring

## Purpose

Systematically refactor code following established patterns while maintaining test coverage and functionality.

---

## Refactoring Workflow

### Step 1: Identify the Smell

Analyze the target code for common issues:

| Smell | Indicator | Refactoring |
|-------|-----------|-------------|
| **Long method** | >30 lines | Extract methods |
| **God class** | >5 responsibilities | Split into focused classes |
| **Primitive obsession** | Raw strings/ints for domain concepts | Introduce value objects |
| **Feature envy** | Method uses another class's data more than its own | Move method |
| **Shotgun surgery** | One change requires editing many files | Consolidate |
| **Duplicate code** | Same logic in 2+ places | Extract shared utility |
| **Layer violation** | Foundation→Foundation call | Move to Orchestration |
| **Prop drilling** | Props passed through 3+ levels | Use Context or Zustand |

### Step 2: Plan the Refactoring

Before making changes:
1. List all files that will be modified
2. Identify which tests cover the affected code
3. Determine if new tests are needed
4. Check that the refactoring aligns with project architecture:
   - **Backend**: The Standard layers, Florance Pattern
   - **Frontend**: Island pattern, RSC-first, Zustand for state

### Step 3: Execute

1. **Run existing tests first** — Ensure they pass before changes
   - Frontend: `npm run test:website`
   - Backend: `dotnet test sites/api.arolariu.ro/tests`
2. **Make incremental changes** — One refactoring at a time
3. **Run tests after each change** — Catch regressions immediately
4. **Update documentation** — JSDoc/XML docs if signatures changed

### Step 4: Verify

- [ ] All existing tests still pass
- [ ] Test coverage has not decreased
- [ ] No new TypeScript `any` types introduced
- [ ] Code follows project naming conventions
- [ ] Lint passes: `npm run lint`
- [ ] Format applied: `npm run format`

---

## Architecture-Aware Refactoring

### Backend (.NET)
- Extract to correct layer (Broker → Foundation → Orchestration → Processing)
- Keep max 2-3 dependencies per service (Florance Pattern)
- Use partial classes for separation: `*.cs`, `*.Exceptions.cs`, `*.Validations.cs`

### Frontend (Next.js)
- Extract client logic to `island.tsx` if `page.tsx` is becoming a Client Component
- Move shared state to Zustand store if prop drilling exceeds 2 levels
- Extract reusable UI to `@arolariu/components` if used in 2+ places

---

## Output Format

Provide a summary after refactoring:

```markdown
## Refactoring Summary

**Target**: [file or module name]
**Smell**: [what was wrong]
**Approach**: [what was done]

### Files Modified
- `path/to/file.ts` — [change description]

### Tests
- Existing: [pass/fail count]
- New: [count added]
- Coverage: [before → after]
```
