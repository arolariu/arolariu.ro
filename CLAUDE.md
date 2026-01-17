# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **arolariu.ro** monorepo - a full-stack platform built with:
- **Frontend**: Next.js 16 + React 19 (main website), SvelteKit 2 (CV site)
- **Backend**: .NET 10 ASP.NET Core Minimal APIs following Domain-Driven Design
- **Infrastructure**: Azure Cloud, managed with Nx monorepo tooling
- **Component Library**: @arolariu/components (shadcn/ui based, 60+ components)

---

## AI Agent Quick Reference

### Task Navigator
| Task | Primary Location | Related Files |
|------|-----------------|---------------|
| Add UI component | `packages/components/src/components/ui/` | `stories/`, `src/index.ts` |
| Add API endpoint | `sites/api.arolariu.ro/src/Core/Endpoints/` | Domain models, `tests/` |
| Add frontend page | `sites/arolariu.ro/src/app/` | `island.tsx`, `_components/` |
| Add translation | `sites/arolariu.ro/messages/` | `en.json`, `ro.json`, `fr.json` |
| Add custom hook | `sites/arolariu.ro/src/hooks/` | `stores/`, `types/` |
| Modify Zustand store | `sites/arolariu.ro/src/stores/` | `hooks/`, `indexedDBStorage.ts` |
| Add CV section | `sites/cv.arolariu.ro/src/data/` | `components/`, `routes/` |
| Update infrastructure | `infra/Azure/Bicep/` | `main.bicep`, `modules/` |
| Add Server Action | `sites/arolariu.ro/src/lib/actions/` | Related hooks, stores |

### Dependency Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        arolariu.ro Monorepo                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   packages/components (@arolariu/components)                            │
│          │ exports UI components                                        │
│          ↓                                                              │
│   sites/arolariu.ro (Next.js 16) ←─── API calls ───→ sites/api.arolariu.ro │
│          │                                                   (.NET 10)  │
│          │ shares types via @/types                                     │
│          ↓                                                              │
│   sites/cv.arolariu.ro (SvelteKit) [standalone - no dependencies]       │
│                                                                         │
│   sites/docs.arolariu.ro (DocFX) [documentation only]                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Configuration Files
| Config | Location | Purpose |
|--------|----------|---------|
| TypeScript | `sites/*/tsconfig.json` | TS compiler (strict mode) |
| ESLint | `sites/arolariu.ro/eslint.config.js` | Linting (20+ plugins) |
| Prettier | `.prettierrc` | Code formatting |
| Next.js | `sites/arolariu.ro/next.config.ts` | Framework config |
| Vitest | `sites/*/vitest.config.ts` | Unit test config |
| Playwright | `sites/arolariu.ro/playwright.config.ts` | E2E test config |
| MCP Servers | `.mcp.json` | Claude Code MCP servers |

### Troubleshooting
| Issue | Solution |
|-------|----------|
| MCP servers not starting (Windows) | Use `cmd /c npx` in `.mcp.json` |
| Tests failing with coverage errors | Check thresholds in `vitest.config.ts` |
| Build fails with TS errors | Run `npm run generate` first |
| Missing translations | Run `npm run generate:i18n` to sync locales |
| API connection refused | Ensure API is running: `npm run dev:api` |
| Component not found | Check barrel export in `packages/components/src/index.ts` |

### MCP Server Capabilities
The `.mcp.json` file configures these servers for enhanced AI assistance:
- **sequential-thinking**: Multi-step reasoning and planning
- **playwright**: Browser automation for E2E testing
- **eslint**: Real-time linting feedback
- **filesystem**: Project file operations
- **memory**: Persistent context across sessions
- **fetch**: HTTP request capabilities

---

## Common Commands

### Development
```bash
npm run dev:website        # Start website → http://localhost:3000
npm run dev:api            # Start API → http://localhost:5000
npm run dev:components     # Start Storybook → http://localhost:6006
npm run dev:cv             # Start CV site → http://localhost:4173
```

### Build
```bash
npm run build              # Build all projects
npm run build:website      # Build website only
npm run build:api          # Build API only
npm run build:components   # Build component library
```

### Testing
```bash
npm run test               # Run all tests
npm run test:unit          # Unit tests only (Vitest for frontend, xUnit for backend)
npm run test:e2e           # E2E tests (Playwright for frontend, Newman for backend)
npm run test:e2e:frontend  # Frontend E2E only
npm run test:e2e:backend   # Backend E2E only
npm run test:website       # Website unit tests
npm run test:api           # API tests
```

### Code Quality
```bash
npm run lint               # Lint all projects
npm run format             # Format all files (Prettier)
npm run generate           # Generate code (i18n, env files, GraphQL)
```

### Backend-Specific (.NET)
```bash
cd sites/api.arolariu.ro
dotnet build src/Core
dotnet test tests
dotnet run --project src/Core
```

## Architecture

### Monorepo Structure
```
packages/
  components/              # @arolariu/components library (Radix UI based)
sites/
  arolariu.ro/             # Next.js 16 main website
  api.arolariu.ro/         # .NET 10 backend API
  cv.arolariu.ro/          # SvelteKit CV site
  docs.arolariu.ro/        # Documentation site
scripts/                   # Build and utility scripts
infra/Azure/Bicep/         # Infrastructure as Code
docs/rfc/                  # Architecture Decision Records
```

### Backend Architecture (The Standard + DDD)

The backend follows **The Standard** layered architecture with Domain-Driven Design:

```
Endpoints → Processing Services → Orchestration Services → Foundation Services → Brokers
```

**Bounded Contexts:**
- `Core/` - Application entry point, infrastructure, cross-cutting concerns
- `Core.Auth/` - Authentication and authorization
- `Invoices/` - Invoice management domain (main business logic)
- `Common/` - Shared infrastructure, DDD base classes, telemetry

**Key Patterns:**
- Maximum 2-3 dependencies per service (Florance Pattern)
- Partial classes for separation: `*.cs`, `*.Exceptions.cs`, `*.Validations.cs`
- TryCatch pattern with Activity tracing for observability
- Test naming: `MethodName_Condition_ExpectedResult()`

### Frontend Architecture (Next.js App Router)

**Server Components by default** - only use `"use client"` when needed for:
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)

**Key Patterns:**
- Island pattern: `page.tsx` (RSC) delegates to `island.tsx` (Client Component)
- State management: Zustand stores with IndexedDB persistence
- Server Actions in `src/lib/actions/`
- Custom hooks in `src/hooks/` (useInvoice, useInvoices, useMerchant, etc.)
- i18n via next-intl (messages in `messages/en.json`, `messages/ro.json`, `messages/fr.json`)

## Code Standards

### TypeScript (Strictest Mode)
- **Never use `any`** - use `unknown` with type guards
- Always declare explicit return types
- Use `readonly` for immutable parameters
- Import types with `import type`
- Path alias: `@/*` maps to `./src/*`

### C# (.NET)
- XML documentation on all public APIs
- `ConfigureAwait(false)` in library code
- Primary constructors (C# 12+)
- Central package management via `Directory.Packages.props`
- Build warnings treated as errors

### Testing
- Frontend: Vitest with 90% coverage threshold
- Backend: xUnit with `MethodName_Condition_ExpectedResult()` naming
- E2E: Playwright (frontend), Newman/Postman (backend)

## Key Documentation

| RFC | Topic |
|-----|-------|
| RFC 2001 | Domain-Driven Design Architecture |
| RFC 2002 | OpenTelemetry Backend Observability |
| RFC 2003 | The Standard Implementation |
| RFC 1001 | Frontend OpenTelemetry System |
| RFC 1003 | Internationalization (next-intl) |
| RFC 1004 | Metadata & SEO System |
| RFC 1005 | State Management (Zustand) |
| RFC 1006 | Component Library Architecture |
| RFC 1007 | Advanced Frontend Patterns |

Additional instructions for GitHub Copilot are in `.github/instructions/`:
- `backend.instructions.md` - DDD and .NET patterns
- `frontend.instructions.md` - Next.js and React patterns
- `typescript.instructions.md` - TypeScript standards

## Environment Setup

**Prerequisites:**
- Node.js ≥24
- .NET 10.0 SDK
- npm ≥11 (bundled with Node.js 24)

**Initial Setup:**
```bash
git clone https://github.com/arolariu/arolariu.ro.git
cd arolariu.ro
npm install
npm run setup     # Generates env files, i18n, etc.
npm run dev:website
```
