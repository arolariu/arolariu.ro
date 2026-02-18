---
name: "migration"
description: 'Guides dependency and framework migrations safely with audit, planning, implementation, testing, and rollback strategies.'
agent: 'agent'
model: 'Claude Sonnet 4.5'
tools: ['codebase', 'search', 'editFiles', 'terminalLastCommand']
---

# Migration Guide

## Purpose

Safely migrate dependencies, frameworks, or patterns while preserving functionality and test coverage.

---

## Migration Workflow

### Phase 1: Audit

1. **Identify the scope**: What is being migrated? (dependency version, framework, pattern)
2. **Check breaking changes**: Read changelogs, migration guides, and deprecation notices
3. **Map affected files**: List every file that imports/uses the migrated dependency
4. **Check test coverage**: Ensure affected code has tests before migrating

```bash
# Find all imports of a dependency
grep -r "from 'old-package'" sites/arolariu.ro/src/ --include="*.ts" --include="*.tsx"

# Check current version
npm list old-package
```

### Phase 2: Plan

Create a migration plan document:

```markdown
## Migration: [Old] → [New]

### Scope
- Package: `old-package@X.Y.Z` → `new-package@A.B.C`
- Files affected: [count]
- Breaking changes: [list]

### Changes Required
| File | Change | Risk |
|------|--------|------|
| `path/to/file.ts` | Update import | Low |

### Rollback Strategy
- Git: `git revert <commit-hash>`
- Package: `npm install old-package@X.Y.Z`
```

### Phase 3: Implement

1. **Update dependency**: `npm install new-package@latest`
2. **Apply code changes**: Work through the change list file by file
3. **Run tests after each file**: Catch regressions immediately
4. **Update TypeScript types**: Check for new/changed type definitions

### Phase 4: Verify

- [ ] All existing tests pass
- [ ] `npm run build:website` succeeds (or `dotnet build`)
- [ ] `npm run lint` passes
- [ ] No new TypeScript `any` types introduced
- [ ] No new compiler warnings
- [ ] Manual smoke test of affected features

### Phase 5: Document

- Update `AGENTS.md` / `CLAUDE.md` if tech stack versions changed
- Update relevant instruction files if patterns changed
- Add notes to commit message about migration rationale

---

## Common Migration Patterns

### npm Dependency Update

```bash
# Check outdated packages
npm outdated

# Update specific package
npm install package-name@latest

# Update all (careful!)
npm update
```

### .NET Dependency Update

```bash
# Check outdated NuGet packages
dotnet list package --outdated

# Update specific package
dotnet add package PackageName --version X.Y.Z
```

### Framework Major Version

1. Read the official migration guide first
2. Create a dedicated branch: `feat/migrate-[framework]-vX`
3. Make changes incrementally
4. Run full test suite after each step
5. PR with detailed description of all changes

---

## Rollback Strategy

Always have a rollback plan before starting:

```bash
# Tag current state before migration
git tag pre-migration-[name]

# If migration fails, rollback
git revert HEAD~[n]  # Revert n commits
# OR
git reset --soft pre-migration-[name]  # Reset to tag (preserves changes)
```

---

## Output Format

```markdown
## Migration Complete: [Old] → [New]

### Summary
- **Package**: `old@X.Y.Z` → `new@A.B.C`
- **Files changed**: [count]
- **Tests**: [pass count] passing, [fail count] failing

### Breaking Changes Handled
1. [Change 1 — how it was resolved]
2. [Change 2 — how it was resolved]

### Verification
- [ ] Build passes
- [ ] All tests pass
- [ ] Lint passes
- [ ] Smoke tested
```

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Context Intake
- Map source and target architectures before code movement.
- Read relevant domain instructions and RFC(s) for impacted surfaces.
- List dependent files and tests before applying migration edits.

### RFC and Source Checks
1. Identify impacted domain and map to RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files before generating edits.
3. If RFC and source conflict, follow source and flag RFC drift.

### Implementation Steps
1. Produce a file-level change plan before edits.
2. Apply minimal, behavior-safe modifications aligned with repository conventions.
3. Record assumptions explicitly when requirements are ambiguous.

### Validation Steps
```bash
npm run build
npm run test
```

### Ask-User Criteria
Ask the user before proceeding when:
- design choices materially change behavior or UX,
- security, auth, infra, or destructive actions are involved,
- scope boundaries are ambiguous and multiple valid options exist.

### Output Contract
- **Success:** list files changed, validations run, and residual risks.
- **Failure:** provide exact failing step/output, impacted files, and a safe next action.

## Self-Audit and Uncertainty Protocol (Mandatory)

For non-trivial tasks, complete this checklist before final output:

1. **Assumptions:** list non-obvious assumptions that influenced decisions.
2. **Risk Flags:** identify security, behavior, deployment, or data risks.
3. **Confidence:** report `high`, `medium`, or `low` with brief justification.
4. **Evidence:** cite changed files, executed commands, and validation outcomes.

Escalate to the user before continuing when security/auth/infra/destructive or major behavior-changing decisions are involved.

