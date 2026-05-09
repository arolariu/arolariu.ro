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
- Put business logic in Brokers (they are thin wrappers only)
- Make sideways calls (Foundation→Foundation) — use Orchestration
- Exceed 2-3 dependencies per service (Florance Pattern)
- Skip tests for new code
- Use inline styles instead of CSS Modules
- Use sync-over-async patterns (`.Result`, `.Wait()`) in .NET
- Auto-create or delete files without user confirmation
- Force-push to `main` or `preview` branches

## Ask First

- Adding new npm or NuGet dependencies
- Database schema changes (Cosmos or SQL)
- Creating new bounded contexts or Zustand stores
- Modifying authentication/authorization logic
- Changes to `next.config.ts`, CI/CD workflows, or infrastructure
- Modifying shared component library (`packages/components/`)

## Copilot Runtime Guidance

- **Skills vs prompts.** `.github/skills/*/SKILL.md` files auto-attach when their description matches the task. `.github/prompts/*.prompt.md` files are user-invoked via slash commands. Don't author the same workflow twice.
- **MCP tools to prefer.**
  - Use `sequential-thinking` for multi-step planning before code edits.
  - Use `context7` to verify library APIs before recommending them — your training data may not match the installed version.
  - Use `github` MCP for PR/issue/Actions queries instead of inferring state.
- **Memory.** Copilot Memory (server-side) and the file-based `memory` MCP at `.github/memory/memory.json` (mirrored to Copilot CLI via `.copilot/mcp-config.json`) coexist as separate persistent stores.
- **Cloud agent.** When running on a PR, `.github/instructions/**` files matching `applyTo` globs are loaded; this file (`copilot-instructions.md`) is always loaded. AGENTS.md may or may not be loaded depending on surface.

---

For Setup, Code Style, Architecture, Testing, Git Workflow, Tools, RFCs, Troubleshooting, Environment Setup → see [`AGENTS.md`](../AGENTS.md).
