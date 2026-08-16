# GitHub Copilot Instructions — arolariu.ro Monorepo

> **Canonical reference:** [`AGENTS.md`](../AGENTS.md) (root). This file is the always-loaded floor for Copilot surfaces (Chat, code review, cloud agent). For the full Operating Contract, code style, repo structure, testing, git workflow, RFCs, and tools — see AGENTS.md.

## How to use these instructions

- Path-specific rules: `.github/instructions/*.instructions.md` (auto-attached via `applyTo` globs)
- Personas: `.github/agents/*.agent.md` (Copilot agent mode)
- Reusable tasks: `.github/prompts/*.prompt.md` (slash commands)
- Scaffolding skills: `.github/skills/*/SKILL.md` (auto-attached by description)

## Required Execution Sequence

1. **Intake**: identify task scope, touched domains, and assumptions.
2. **Policy gate**: enforce security, architecture, and repository constraints before edits.
3. **RFC grounding**: when task is architecture-sensitive, read relevant `docs/rfc/*.md` and validate referenced source files.
4. **Verification**: do not report success without command/file evidence.
5. **Uncertainty reporting**: explicitly disclose assumptions, confidence risks, and required user checkpoints.

## Instruction Precedence

If rules conflict, resolve in this order:
1. Runtime/system safety constraints
2. Root governance (`.github/copilot-instructions.md`, `AGENTS.md`)
3. Domain instructions (`.github/instructions/*.instructions.md`)
4. Artifact instructions (`.github/agents`, `.github/skills`, `.github/prompts`)
5. File-local conventions

## Violation Severity

| Severity | Definition | Response |
|----------|------------|----------|
| Critical | Security/policy bypass or destructive-risk action | Stop and require explicit user approval |
| High | Architecture or verification breach | Block completion until fixed |
| Medium | Standards drift or partial validation | Fix before merge unless explicitly deferred |
| Low | Non-risk clarity/documentation gaps | Queue as follow-up |

## Never Do

- Use `any` type in TypeScript (strict mode enforced)
- Commit secrets, API keys, connection strings, or credentials
- Commit `docs/superpowers/**` or `.superpowers/**` agent working artifacts; these paths are git-ignored for a reason
- Put business logic in Brokers (they are thin wrappers only)
- Make sideways calls (Foundation→Foundation) — use Orchestration
- Exceed 2-3 dependencies per service (Florance Pattern)
- Skip tests for new code
- Use inline styles instead of CSS Modules
- Use sync-over-async patterns (`.Result`, `.Wait()`) in .NET
- Auto-create or delete files without user confirmation
- Force-push to `main` or `preview` branches
- Run `npm run lint` or `npm run test:website` for routine verification — both are expensive (see [Local Dev Loop](#local-dev-loop--verification)); use `npm run test:unit` + `npm run build:website` instead
- Create a git worktree unless the user explicitly asks — work in the current checkout/branch by default
- Mock our own modules in tests — mock only true external boundaries

## Ask First

- Adding new npm or NuGet dependencies
- Database schema changes (Cosmos or SQL)
- Creating new bounded contexts or Zustand stores
- Modifying authentication/authorization logic
- Changes to `next.config.ts`, CI/CD workflows, or infrastructure
- Modifying shared component library (`packages/components/`)

## Local Dev Loop & Verification

- **Routine verification is cheap by design.** For typical edits, verify with `npm run test:unit` (Vitest unit + MSTest only) and `npm run build:website`. Run these freely.
- **`npm run lint` and `npm run test:website` are expensive — don't run them for routine edits.** `lint` runs ESLint with 20+ plugins; `test:website` runs the **full** website suite (`test:unit && test:e2e` Playwright **&&** `test:storybook`), not unit-only. Reserve both for a final pass before a PR, or when the user explicitly asks.
- **Tests are colocated.** Put `*.test.ts` next to the file it covers (e.g. `utils.generic.test.ts` beside `utils.generic.ts`); shared test builders live in `sites/arolariu.ro/tests/helpers/builders/`.
- **Minimize test doubles.** Prefer real implementations and never mock our own modules — mock only true external boundaries (network, Azure SDK, Clerk, etc.). Excess mocks/stubs/fakes are a smell in this codebase.

## Copilot Runtime Guidance

- **Skills vs prompts.** `.github/skills/*/SKILL.md` files auto-attach when their description matches the task. `.github/prompts/*.prompt.md` files are user-invoked via slash commands. Don't author the same workflow twice.
- **MCP tools to prefer.**
  - Use `sequential-thinking` for multi-step planning before code edits.
  - Use `context7` to verify library APIs before recommending them — your training data may not match the installed version.
  - Use `github` MCP for PR/issue/Actions queries instead of inferring state.
- **Memory.** Copilot Memory (server-side) and the file-based `memory` MCP at `.github/memory/memory.json` (mirrored to Copilot CLI via `.copilot/mcp-config.json`) coexist as separate persistent stores.
- **Cloud agent.** When running on a PR, `.github/instructions/**` files matching `applyTo` globs are loaded; this file (`copilot-instructions.md`) is always loaded. AGENTS.md may or may not be loaded depending on surface.

## Worktrees

- **Default: work in the current checkout/branch.** Do not create a git worktree unless the user explicitly asks for one.
- When you *do* work in `.worktrees/**` or any fresh checkout and touch `sites/arolariu.ro` tests, typechecks, or builds that import `@arolariu/components`, run setup in that same worktree first: `npm install`, then `npm run build:components`.

---

For Setup, Code Style, Architecture, Testing, Git Workflow, Tools, RFCs, Troubleshooting, Environment Setup → see [`AGENTS.md`](../AGENTS.md).
