# AI Customization Guide — arolariu.ro

> How to use and extend the AI-assisted development tools in this monorepo.

## Overview

This repository includes a comprehensive AI customization layer for GitHub Copilot (VS Code, CLI, and coding agent), Claude Code, Cursor, and Windsurf. The system is organized into 6 asset types:

| Asset Type | Location | Count | Auto-loaded? |
|------------|----------|-------|-------------|
| **Instructions** | `.github/instructions/*.instructions.md` | 12 | ✅ By file pattern |
| **Agents** | `.github/agents/*.agent.md` | 6 | ✅ On invocation |
| **Prompts** | `.github/prompts/*.prompt.md` | 9 | Manual (`@workspace /prompt`) |
| **Skills** | `.github/skills/*/SKILL.md` | 4 | Manual (scaffolding) |
| **Extensions** | `.github/extensions/*/extension.mjs` | 3 | ✅ Auto on CLI start |
| **Governance** | `.github/agent-governance/*.md` | 2 | Referenced by instructions |

---

## Instructions (Auto-loaded by file pattern)

Instructions are automatically loaded when you edit files matching their `applyTo` glob pattern:

| Instruction | Applies To | Domain |
|-------------|-----------|--------|
| `frontend.instructions.md` | `sites/arolariu.ro/**` | Next.js, RSC, i18n |
| `backend.instructions.md` | `**/*.cs, **/*.csproj` | DDD, The Standard |
| `react.instructions.md` | `**/*.tsx, **/*.jsx` | React components, hooks |
| `typescript.instructions.md` | `**/*.ts` | TypeScript strict mode |
| `csharp.instructions.md` | `**/*.cs` | C# 13 patterns |
| `components.instructions.md` | `packages/components/**` | Shared UI library |
| `bicep.instructions.md` | `**/*.bicep` | Azure IaC |
| `workflows.instructions.md` | `.github/workflows/*.yml` | GitHub Actions |
| `code-review.instructions.md` | `**` | Code review standards |
| `python.instructions.md` | `sites/exp.arolariu.ro/**/*.py` | FastAPI, Ruff |
| `svelte.instructions.md` | `sites/cv.arolariu.ro/**/*.svelte` | SvelteKit 2 |
| `agent-governance.instructions.md` | `.github/**/*.md` | AI asset governance |

**You don't need to do anything** — these load automatically based on what file you're editing.

---

## Agents (Specialized AI Personas)

Invoke agents for specialized tasks. In VS Code: `@workspace` then select an agent. In Copilot CLI: agents are available as custom agent types.

| Agent | Specialty | When to Use |
|-------|-----------|-------------|
| `backend-expert` | .NET 10, DDD, The Standard | API endpoints, services, database |
| `frontend-expert` | Next.js 16, React 19, TypeScript | Pages, components, state |
| `code-reviewer` | Architecture compliance | PR reviews, code audits |
| `docs-writer` | JSDoc (RFC 1002), XML docs (RFC 2004) | Documentation generation |
| `full-stack-planner` | Cross-domain planning | Feature planning, architecture |
| `infra-expert` | Azure Bicep, GitHub Actions | Infrastructure, CI/CD |

---

## Prompts (Reusable Task Templates)

Invoke with `@workspace /prompt` in VS Code or use directly in Copilot CLI:

| Prompt | Purpose |
|--------|---------|
| `api-endpoint` | Scaffold a new API endpoint (The Standard layers) |
| `new-page` | Scaffold a Next.js page (Island pattern) |
| `unit-test` | Generate unit tests (Vitest or xUnit) |
| `comment-standard` | Add JSDoc/XML documentation to code |
| `fix-bug` | Systematic debugging workflow |
| `extend-store` | Add state/actions to a Zustand store |
| `upgrade-dependency` | Safe dependency upgrade with rollback |
| `refactor` | Systematic refactoring with tests |
| `migration` | Dependency/framework migration |

---

## Skills (Scaffolding with Templates)

Skills generate complete file structures for common patterns:

| Skill | What It Creates |
|-------|----------------|
| `ddd-service` | Complete DDD service (Broker + Foundation + Processing + Tests) |
| `react-component` | React component with types, tests, and accessibility |
| `i18n-page` | Internationalized page with en/ro/fr translations |
| `zustand-store` | Zustand store with IndexedDB persistence and tests |

---

## CLI Extensions (Active Session Enhancements)

These run automatically in every Copilot CLI session:

| Extension | What It Does |
|-----------|-------------|
| `arolariu-context` | Injects live version numbers and RFC references per domain |
| `arolariu-guardrails` | Blocks destructive commands, detects `any` types, enforces styling best practices |
| `arolariu-workflow` | Custom tools: `arolariu_lookup_rfc`, `arolariu_check_project_health`, `arolariu_list_stores` |

---

## Subdirectory AGENTS.md Files

Each major project has its own focused `AGENTS.md`:

| Directory | Focus |
|-----------|-------|
| `sites/arolariu.ro/AGENTS.md` | Next.js frontend patterns |
| `sites/api.arolariu.ro/AGENTS.md` | .NET backend patterns |
| `packages/components/AGENTS.md` | Component library rules |
| `sites/exp.arolariu.ro/AGENTS.md` | Python/FastAPI patterns |
| `sites/cv.arolariu.ro/AGENTS.md` | SvelteKit standalone rules |

---

## Governance

All AI assets follow the [Agent Governance Contract](../copilot-instructions.md#agent-governance-contract-mandatory):

1. **Task Intake** — Identify scope and assumptions
2. **Policy Gate** — Enforce security and architecture constraints
3. **RFC Grounding** — Consult `docs/rfc/` for architecture changes
4. **Verification** — Evidence-based completion
5. **Uncertainty Reporting** — Disclose risks and assumptions

Protocols:
- `agent-governance/rfc-grounding-protocol.md` — When and how to consult RFCs
- `agent-governance/self-audit-protocol.md` — Pre-completion verification checklist

---

## Adding New Assets

### New Instruction File
1. Create `.github/instructions/<name>.instructions.md`
2. Add YAML frontmatter with `applyTo` glob pattern
3. Include Instruction Contract section (scope, rules, verification)

### New Agent
1. Create `.github/agents/<name>.agent.md`
2. Define persona, expertise, tools, and constraints
3. Reference relevant RFCs and instruction files

### New Extension
1. Run: `mkdir .github/extensions/<name>`
2. Create `extension.mjs` using `@github/copilot-sdk`
3. Reload: `/clear` or `extensions_reload`

---

## MCP Servers

The `.mcp.json` configures 8 MCP servers for enhanced AI capabilities:

| Server | Package | Capability |
|--------|---------|-----------|
| `sequential-thinking` | `@modelcontextprotocol/server-sequential-thinking` | Multi-step reasoning and planning |
| `playwright` | `@playwright/mcp` | Browser automation for E2E testing |
| `eslint` | `@eslint/mcp` | Real-time linting feedback |
| `memory` | `@modelcontextprotocol/server-memory` | Persistent knowledge graph (→ `.github/memory/memory.json`) |
| `github` | `github-mcp` | GitHub PRs, issues, actions, code search |
| `context7` | `@upstash/context7-mcp` | Live library/framework documentation (say "use context7") |
| `filesystem` | `@modelcontextprotocol/server-filesystem` | Structured file ops (scoped to src/, docs/, infra/) |
| `azure-devops` | `@azure-devops/mcp` | Azure DevOps work items, builds, repos, wikis |
