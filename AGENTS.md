# AGENTS.md

> Guidance for AI coding agents working in the **arolariu.ro** monorepo.

## Project Overview

**arolariu.ro** is a full-stack pet-project platform for invoice management and personal branding, built as a monorepo:

- **Frontend**: Next.js 16.2 + React 19.2.4 (main website at `sites/arolariu.ro/`)
- **Backend**: .NET 10 ASP.NET Core Minimal APIs with Domain-Driven Design (at `sites/api.arolariu.ro/`)
- **Component Library**: `@arolariu/components` — 70+ Base UI components with CSS Modules styling (at `packages/components/`)
- **CV Site**: SvelteKit 2 (at `sites/cv.arolariu.ro/` — standalone, no cross-dependencies)
- **Infrastructure**: Azure Cloud, Bicep IaC (at `infra/Azure/Bicep/`)
- **Tooling**: Nx monorepo, npm >=11, Node.js >=24, .NET 10 SDK

---

## Setup Commands

```bash
# First-time setup
npm install && npm run setup

# Development servers
npm run dev:website        # Next.js → http://localhost:3000
npm run dev:api            # .NET API → http://localhost:5000
npm run dev:components     # Storybook → http://localhost:6006
npm run dev:cv             # SvelteKit CV → http://localhost:4173

# Build
npm run build              # Build all projects
npm run build:website      # Build website only
npm run build:api          # Build API only
npm run build:components   # Build component library

# Testing
npm run test               # Run all tests
npm run test:unit          # Unit tests (Vitest + xUnit)
npm run test:e2e           # E2E tests (Playwright + Newman)
npm run test:website       # Website unit tests only
npm run test:api           # API tests only

# Code quality
npm run lint               # ESLint (20+ plugins)
npm run format             # Prettier
npm run generate           # Generate i18n, env files, GraphQL types

# Backend-specific
dotnet build sites/api.arolariu.ro/src/Core
dotnet test sites/api.arolariu.ro/tests
dotnet test sites/api.arolariu.ro/tests --collect:"XPlat Code Coverage"
```

---

## Agent Operating Contract

All agent assets in this repository must apply the same execution contract to ensure reliable, RFC-grounded outcomes.

### Required Execution Sequence
1. **Intake**: identify task scope, touched domains, and assumptions.
2. **Policy gate**: enforce security, architecture, and repository constraints before edits.
3. **RFC grounding**: when task is architecture-sensitive, read relevant `docs/rfc/*.md` and validate referenced source files.
4. **Verification**: do not report success without command/file evidence.
5. **Uncertainty reporting**: explicitly disclose assumptions, confidence risks, and required user checkpoints.

### Instruction Precedence
If rules conflict, resolve in this order:
1. Runtime/system safety constraints
2. Root governance (`.github/copilot-instructions.md`, `AGENTS.md`)
3. Domain instructions (`.github/instructions/*.instructions.md`)
4. Artifact instructions (`.github/agents`, `.github/skills`, `.github/prompts`)
5. File-local conventions

### Violation Severity
| Severity | Definition | Response |
|----------|------------|----------|
| Critical | Security/policy bypass or destructive-risk action | Stop and require explicit user approval |
| High | Architecture or verification breach | Block completion until fixed |
| Medium | Standards drift or partial validation | Fix before merge unless explicitly deferred |
| Low | Non-risk clarity/documentation gaps | Queue as follow-up |

### RFC Lookup Protocol
Use `.github/agent-governance/rfc-grounding-protocol.md` whenever a task touches architecture, workflow design, security, state management, observability, or public API contracts.  
If RFC text conflicts with source code, treat source code as truth and record RFC drift for follow-up.

### Self-Audit Protocol
For non-trivial work, apply `.github/agent-governance/self-audit-protocol.md` before finalizing output.  
Always disclose assumptions, confidence level, risk flags, and validation evidence; escalate to user when risk thresholds are hit.

---

## Repository Structure

```
packages/
  components/              # @arolariu/components — shared UI library (Base UI + CSS Modules)
sites/
  arolariu.ro/             # Next.js 16 main website
    src/app/               #   App Router pages (RSC by default)
    src/hooks/             #   Custom React hooks (useInvoice, etc.)
    src/stores/            #   Zustand stores with IndexedDB persistence
    src/lib/actions/       #   Server Actions
    src/types/             #   TypeScript type definitions
    messages/              #   i18n translations (en.json, ro.json, fr.json)
  api.arolariu.ro/         # .NET 10 backend API
    src/Core/              #   Entry point, infrastructure, health
    src/Core.Auth/         #   Authentication bounded context
    src/Invoices/          #   Invoice management bounded context
    src/Common/            #   Shared DDD base classes, telemetry
    tests/                 #   xUnit + MSTest tests
  cv.arolariu.ro/          # SvelteKit CV site (standalone)
  docs.arolariu.ro/        # DocFX documentation site
  exp.arolariu.ro/         # Python FastAPI experimental service
scripts/                   # Build and utility scripts
infra/Azure/Bicep/         # Infrastructure as Code
docs/rfc/                  # Architecture Decision Records (RFCs)
.github/
  instructions/            # Copilot context-aware instruction files
  agents/                  # Copilot custom agent definitions
  prompts/                 # Copilot reusable prompt files
  skills/                  # Copilot agent skills (instructions + templates)
  copilot-instructions.md  # Root Copilot instructions
```

---

## Code Style

### TypeScript (strict mode — zero `any` tolerance)

```typescript
// DO: Explicit types, Readonly props, proper hooks
interface Props {
  readonly invoiceId: string;
}

export default function InvoiceCard({invoiceId}: Readonly<Props>): React.JSX.Element {
  const [data, setData] = useState<Invoice | null>(null);
  return <div>{data?.name}</div>;
}

// DON'T: any types, missing return types, prop drilling
function BadComponent(data: any) { return <div>{data.thing}</div>; }
```

### C# (.NET 10, C# 13)

```csharp
// DO: XML docs, ConfigureAwait, primary constructors, TryCatch pattern
/// <summary>Creates a new invoice in storage.</summary>
/// <param name="invoice">The invoice to create.</param>
public async Task CreateInvoiceAsync(Invoice invoice) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
        ValidateInvoice(invoice);
        await _broker.CreateAsync(invoice).ConfigureAwait(false);
    }).ConfigureAwait(false);

// DON'T: Business logic in Brokers, sideways service calls, sync-over-async
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| TS components | PascalCase | `InvoiceCard.tsx` |
| TS hooks | camelCase with `use` prefix | `useInvoice.tsx` |
| TS stores | camelCase with `Store` suffix | `invoiceStore.ts` |
| C# classes | PascalCase | `InvoiceFoundationService.cs` |
| C# interfaces | `I` prefix | `IInvoiceNoSqlBroker.cs` |
| C# tests | `Method_Condition_Expected` | `CreateInvoice_ValidInput_ReturnsCreated()` |
| Branches | `type/short-description` | `feat/invoice-export` |
| Commits | Conventional Commits | `feat: add invoice export endpoint` |

---

## Architecture

### Frontend — Island Pattern (RSC-first)

```
page.tsx (Server Component — data fetching, metadata, SEO)
  └→ island.tsx (Client Component — interactivity, state, event handlers)
       └→ _components/ (local sub-components)
```

- **Server Components** by default — no `"use client"` unless needed
- **State**: Zustand stores (global) → React Context (scoped) → useState (local)
- **i18n**: next-intl with `en.json`, `ro.json`, `fr.json` in `messages/`
- **Auth**: Clerk middleware — not in-component checks

### Backend — The Standard (5 layers)

```
Endpoints (Exposers) → HTTP mapping, 1 Processing service
    ↓
Processing Services → Heavy computation, AI/ML, 1-2 Orchestration services
    ↓
Orchestration Services → Coordination, cross-cutting, 2-3 Foundation services
    ↓
Foundation Services → CRUD, validation, 1-2 Brokers
    ↓
Brokers → External abstraction, thin wrappers, NO business logic
```

- **Florance Pattern**: Max 2-3 dependencies per service
- **Bounded Contexts**: Core (infra), Core.Auth (auth), Invoices (business), Common (shared)
- **TryCatch pattern** with OpenTelemetry Activity tracing on all service methods

### Dependency Flow

```
@arolariu/components (shared UI)
        ↓ imports
sites/arolariu.ro (Next.js) ←── API calls ──→ sites/api.arolariu.ro (.NET)
        ↓ (no dependency)
sites/cv.arolariu.ro (SvelteKit — standalone)
```

---

## Testing

| Domain | Framework | Coverage Target | Command |
|--------|-----------|----------------|---------|
| Frontend unit | Vitest + Testing Library | 90%+ | `npm run test:website` |
| Frontend E2E | Playwright | Critical paths | `npm run test:e2e:frontend` |
| Backend unit | xUnit + MSTest | 85%+ | `dotnet test sites/api.arolariu.ro/tests` |
| Backend E2E | Newman/Postman | API contracts | `npm run test:e2e:backend` |

**Test patterns**: AAA (Arrange, Act, Assert), mock builders (`InvoiceBuilder`, `ProductBuilder`), proper cleanup in `afterEach`.

---

## Security Boundaries

### Always Do
- Follow The Standard layer hierarchy
- Use `Readonly<Props>` for React component props
- Add XML docs (C#) / JSDoc (TS) on all public APIs
- Use `.ConfigureAwait(false)` in .NET library code
- Handle loading, error, and empty states in UI
- Use `next-intl` for all user-facing strings
- Run `npm run lint` and `npm run format` before committing

### Ask First
- Adding new npm or NuGet dependencies
- Database schema changes (Cosmos or SQL)
- Creating new bounded contexts or Zustand stores
- Modifying authentication/authorization logic
- Changes to `next.config.ts`, CI/CD workflows, or infrastructure
- Modifying shared component library (`packages/components/`)

### Never Do
- Use `any` type in TypeScript (strict mode enforced)
- Commit secrets, API keys, connection strings, or credentials
- Put business logic in Brokers (they are thin wrappers only)
- Make sideways calls (Foundation→Foundation) — use Orchestration
- Exceed 2-3 dependencies per service (Florance Pattern)
- Skip tests for new code
- Use inline styles instead of CSS Modules
- Use sync-over-async patterns (`.Result`, `.Wait()`) in .NET
- Auto-create or delete files without user confirmation
- Force-push to main/preview branches

---

## Git Workflow

- **Main branch**: `main` (production)
- **Preview branch**: `preview` (staging)
- **Feature branches**: `feat/description`, `fix/description`, `refactor/description`
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- **PR process**: Create branch → implement → test → lint → PR against `main`
- **CI**: GitHub Actions (build, test, lint, deploy) — see `.github/workflows/`

---

## Available Tools & Resources

### AI Instruction Files

| Type | Location | Purpose |
|------|----------|---------|
| Instructions | `.github/instructions/*.instructions.md` | Auto-loaded by file pattern |
| Agents | `.github/agents/*.agent.md` | Specialized AI personas |
| Prompts | `.github/prompts/*.prompt.md` | Reusable task templates |
| Skills | `.github/skills/*/SKILL.md` | Scaffolding with templates |

### MCP Servers

| Server | Package | Capability |
|--------|---------|-----------|
| sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | Multi-step reasoning and planning |
| playwright | `@playwright/mcp` | Browser automation for E2E testing |
| eslint | `@eslint/mcp` | Real-time linting feedback |
| memory | `@modelcontextprotocol/server-memory` | Persistent knowledge graph (→ `.github/memory/memory.json`) |
| github | `github-mcp` | GitHub PRs, issues, actions, code search |
| context7 | `@upstash/context7-mcp` | Live library/framework documentation injection |
| filesystem | `@modelcontextprotocol/server-filesystem` | Structured file operations (scoped to src/) |
| azure-devops | `@azure-devops/mcp` | Azure DevOps work items, builds, repos |

### RFCs (Architecture Decisions)

| RFC | Topic |
|-----|-------|
| 0001 | GitHub Actions Workflows |
| 1001 | Frontend OpenTelemetry Observability |
| 1002 | Comprehensive JSDoc/TSDoc Documentation |
| 1003 | Internationalization (next-intl) |
| 1004 | Metadata & SEO System |
| 1005 | State Management (Zustand) |
| 1006 | Component Library Architecture |
| 1007 | Advanced Frontend Patterns |
| 1008 | SCSS System Architecture |
| 2001 | Domain-Driven Design Architecture |
| 2002 | OpenTelemetry Backend Observability |
| 2003 | The Standard Implementation |
| 2004 | Comprehensive XML Documentation |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP servers not starting (Windows) | Use `cmd /c npx` in `.mcp.json` |
| Tests failing with coverage errors | Check thresholds in `vitest.config.ts` |
| Build fails with TS errors | Run `npm run generate` first |
| Missing translations | Run `npm run generate:i18n` to sync locales |
| API connection refused | Ensure API is running: `npm run dev:api` |
| Component not found | Check barrel export in `packages/components/src/index.ts` |
| .NET build warnings as errors | Fix all warnings — `TreatWarningsAsErrors` is enabled |
| Missing XML docs | Add `<summary>`, `<param>`, `<returns>` to public APIs (CS1591) |

---

## Environment Setup

**Prerequisites**: Node.js >=24, .NET 10.0 SDK, npm >=11

```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
npm run setup     # Generates env files, i18n, etc.
npm run dev:website
```
