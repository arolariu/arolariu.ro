# AGENTS.md

Guidance for AI coding agents working in the **arolariu.ro** monorepo.

## Repository Overview

`arolariu.ro` is an Nx-managed monorepo containing:

- `sites/arolariu.ro/` - Next.js website.
- `sites/api.arolariu.ro/` - .NET Minimal API modular monolith.
- `packages/components/` - shared `@arolariu/components` UI library.
- `sites/cv.arolariu.ro/` - standalone SvelteKit CV site.
- `sites/status.arolariu.ro/` - SvelteKit service-status site.
- `sites/exp.arolariu.ro/` - Python/FastAPI experimental service.
- `sites/docs.arolariu.ro/` - documentation site.
- `infra/Azure/Bicep/` - Azure infrastructure as code.
- `tooling/AppHost/` - .NET Aspire local orchestration.

## Versions

This table is the canonical runtime and framework source for human-readable AI
guidance. Update it when the referenced machine-readable source changes;
downstream instructions, agents, skills, and prompts reference this section
instead of copying version values.

| Component | Version | Where to verify |
| --- | --- | --- |
| Node.js | >=24 | `package.json` engines |
| npm | >=11 | `package.json` engines |
| .NET SDK | 10.0 | `sites/api.arolariu.ro/Directory.Build.props` |
| C# | 14 | `<LangVersion>latest</LangVersion>` in `sites/api.arolariu.ro/Directory.Build.props` |
| Next.js | 16.3.0 | `package.json` |
| React | 19.2.8 | `package.json` |
| TypeScript | 6.0.3 | `package.json` |
| SvelteKit | 2.70.2 | `package.json` |
| Nx | 23.1.1 | `package.json` |

## Commands

```powershell
# First-time setup
npm install
npm run setup

# Aspire local development with an explicit container engine
npm run dev -- --engine rancher
npm run dev -- --engine podman

# Self-hosted container mode
npm run dev:selfhost -- --engine rancher
npm run dev:selfhost -- --engine podman
npm run dev:selfhost:stop -- --engine rancher
npm run dev:selfhost:stop -- --engine podman

# Standalone services
npm run dev:website
npm run dev:api
npm run dev:cv
npm run dev:exp
npm run dev:docs
npm run dev:status
npm run dev:components

# Builds
npm run build
npm run build:website
npm run build:api
npm run build:components
npm run build:cv

# Tests
npm run test
npm run test:unit
npm run test:api
npm run test:e2e
npm run test:e2e:frontend
npm run test:e2e:backend
npm run test:website

# Quality and generation
npm run lint
npm run format
npm run generate
npm run generate:i18n

# Direct backend commands
dotnet build sites/api.arolariu.ro/src/Core
dotnet test sites/api.arolariu.ro/tests
dotnet test sites/api.arolariu.ro/tests --collect:"XPlat Code Coverage"
```

### Local Development Modes

**Aspire is the default.** Applications run natively with hot reload while SQL
Server, the Cosmos emulator, Azurite, and Redis run through Rancher Desktop or
Podman Desktop. The Aspire dashboard is available at
`https://localhost:17080`.

**Selfhost is the container-parity mode.** Use it for container behavior,
deployment-parity, or image audits.

**Standalone service scripts are narrow fallbacks.** Use one when full-stack
coordination is unnecessary.

Local bootstrap restores deterministic Alice, Bob, and Charlie scenarios. It
clears seeded Cosmos invoice/merchant documents, invoice blobs, and the
`invoice-analysis` queue while preserving warm infrastructure state. No
development token or signing secret is committed.

## Agent Operating Contract

1. Inspect live source and the narrowest applicable guidance before acting.
2. Proceed autonomously on explicit, reversible, in-scope work that follows an
   established repository pattern.
3. Ask before dependencies, authentication/security behavior, schema or data
   migration, infrastructure/deployment/cost, destructive operations, or
   unresolved public behavior with materially different valid outcomes.
4. Use source and configuration for current behavior and accepted RFCs for
   architectural intent. Surface material drift instead of silently choosing.
5. Make the smallest complete change and validate it with the smallest
   existing check that proves the result.
6. Report only material assumptions, residual risk, incomplete validation, or
   blockers. Do not emit ritual confidence blocks.

### Authority

When guidance conflicts, use this order:

1. Runtime and security constraints.
2. Live code and configuration.
3. This file and `.github/copilot-instructions.md`.
4. The nearest subproject `AGENTS.md`.
5. Matching `.github/instructions/*.instructions.md`.
6. Agents, skills, and prompts.
7. Memory.

An RFC defines intent. Live source defines current behavior. If resolving drift
would change behavior, stop and ask.

### Agent Working Artifacts

Never commit `docs/superpowers/**` or `.superpowers/**`. They are ignored
planning, verification, and visual-companion artifacts.

## Repository Architecture

### Frontend

```text
page.tsx (Server Component)
  -> island.tsx (Client Component only when interaction requires it)
       -> _components/ (route-local components)
```

- Server Components are the default.
- State order is Zustand for global state, Context for scoped state, then local
  React state.
- User-visible text uses `next-intl` with `en`, `ro`, and `fr`.
- Authentication is enforced at the Clerk middleware boundary.
- Site-specific styling uses CSS Modules; shared UI comes from
  `@arolariu/components`.

### Backend

The Invoices bounded context implements the full Standard chain:

```text
Endpoints -> Management -> Processing -> Orchestration -> Foundation -> Brokers
```

- Brokers are thin external-system wrappers with no business logic.
- Invoices Management is the application façade consumed by its endpoints and
  workers.
- Foundation services do not call other Foundation services.
- Services have at most two or three dependencies (Florance Pattern).
- Service methods use the repository TryCatch and OpenTelemetry Activity
  patterns.
- Bounded contexts are Core, Core.Auth, Invoices, and Common.
- Core.Auth is a deliberate exception: its endpoints use ASP.NET Core Identity
  managers directly and do not have Management/Processing/Orchestration/
  Foundation layers.

### Dependency Direction

```text
@arolariu/components -> sites/arolariu.ro -> HTTP -> sites/api.arolariu.ro
sites/cv.arolariu.ro and sites/status.arolariu.ro remain standalone sites.
```

## Coding Conventions

### TypeScript and React

- Strict TypeScript; never introduce explicit `any`.
- Prefer precise types, discriminated unions, generics, or `unknown` plus a
  type guard.
- Public functions have explicit return types and useful JSDoc.
- Component props use `Readonly<Props>`.
- Keep Server Components server-side; add `"use client"` only for hooks,
  browser APIs, state, or event handlers.
- User-facing strings use translations.
- Do not use inline style objects in application or shared-component code.

### C#

- Public APIs have XML documentation.
- Library/service async code uses `.ConfigureAwait(false)`.
- Never use `.Result` or `.Wait()`.
- Treat warnings as errors and fix diagnostics at the source.
- Use typed exception classification and the repository TryCatch pattern.

### Naming

| Context | Convention |
| --- | --- |
| TypeScript components | PascalCase |
| React hooks | `use` + camelCase |
| Zustand stores | camelCase + `Store` |
| C# classes | PascalCase |
| C# interfaces | `I` prefix |
| C# tests | `Method_Condition_Expected` |
| Branches | `type/short-description` |
| Commits | Conventional Commits |

## Testing and Verification

| Domain | Framework | Target |
| --- | --- | --- |
| Frontend unit | Vitest + Testing Library | 90%+ |
| Frontend E2E | Playwright | Critical paths |
| Backend unit | MSTest | 85%+ |
| Backend E2E | Newman/Postman | API contracts |

- Colocate frontend `*.test.ts`/`*.test.tsx` files with the source they cover.
- Use AAA structure and deterministic builders.
- Mock only true external boundaries such as network, Azure SDK, or Clerk. Do
  not mock repository modules.
- Routine frontend verification is `npm run test:unit` and
  `npm run build:website` when both apply.
- Reserve `npm run lint` and `npm run test:website` for a final pass or an
  explicit request.
- Backend verification uses the smallest relevant `dotnet build` and
  `dotnet test` selection.
- Documentation-only changes need no application build unless a documentation
  check exists.

## Risk Boundaries

### Proceed Autonomously

- Read/search within the repository.
- Create, edit, rename, format, and test files required by an explicit,
  reversible task.
- Reuse established helpers and patterns.
- Run targeted existing checks.

### Ask First

- Add or replace npm, NuGet, Python, MCP, extension, or system dependencies.
- Change database schemas or perform data migration.
- Create a bounded context or Zustand store.
- Change authentication, authorization, or security behavior.
- Change `next.config.ts`, infrastructure, deployment, production workflows,
  or material cloud cost.
- Modify the shared component library when it is incidental rather than
  explicitly requested.
- Delete data, rewrite history, or perform another irreversible operation.
- Choose among materially different API, product, or UX behaviors without a
  safe established default.

### Never

- Commit secrets, tokens, credentials, or connection strings.
- Force-push `main` or `preview`.
- Put business logic in Brokers.
- Make Foundation-to-Foundation calls.
- Exceed the service dependency limit without an approved architecture change.
- Use sync-over-async in .NET.
- Introduce explicit TypeScript `any`.
- Skip tests for changed behavior.
- Commit agent working artifacts.

## Git Workflow

- `main` is production; `preview` is staging.
- Use `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, or `chore/` branches.
- Use Conventional Commit messages.
- Target the branch named by the task; otherwise target `main`.
- Never force-push protected branches.

## AI Customization

| Asset | Location | Responsibility |
| --- | --- | --- |
| Root contract | `AGENTS.md` | Canonical facts and repository-wide rules |
| Copilot contract | `.github/copilot-instructions.md` | Universal Copilot execution behavior |
| Local guides | `**/AGENTS.md` | Project-only facts and exceptions |
| Instructions | `.github/instructions/` | File-triggered language/domain constraints |
| Agents | `.github/agents/` | Specialist ownership and routing |
| Skills | `.github/skills/` | Repeatable task workflows |
| Prompts | `.github/prompts/` | Local VS Code shortcuts |
| Extensions | `.github/extensions/` | Optional Copilot CLI acceleration |
| Memory | `.github/memory/memory.json` | Durable, non-source-derived learned context |

`CLAUDE.md` is a best-effort symlink to this file. Repository MCP configuration
lives in `.github/mcp.json`.

## RFC Map

| RFC | Topic |
| --- | --- |
| 0001 | GitHub Actions |
| 1001 | Frontend observability |
| 1002 | JSDoc/TSDoc |
| 1003 | Internationalization |
| 1004 | Metadata and SEO |
| 1005 | Zustand state |
| 1006 | Component library |
| 1007 | Advanced frontend patterns |
| 1008 | SCSS architecture |
| 2001 | Domain-driven design |
| 2002 | Backend observability |
| 2003 | The Standard |
| 2004 | XML documentation |

## Troubleshooting

| Problem | Action |
| --- | --- |
| Build reports missing generated files | Run `npm run generate` |
| Missing translations | Run `npm run generate:i18n` |
| API is unavailable | Run `npm run dev:api` |
| Shared component import fails | Verify `packages/components/src/index.ts` |
| .NET warnings fail the build | Fix the warning; do not suppress it |
| Public C# API fails CS1591 | Add the required XML documentation |
| Copilot extension fails | Inspect it with Copilot CLI extension management; source presence is not runtime health |
