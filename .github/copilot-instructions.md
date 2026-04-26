# GitHub Copilot Instructions for arolariu.ro Monorepo

This document provides comprehensive guidelines for GitHub Copilot when working with the arolariu.ro monorepo codebase.

> **See also**: `AGENTS.md` (root) for agent-level guidance | `.github/instructions/` for domain-specific rules | `.github/agents/` for specialized agents | `.github/prompts/` for task templates | `.github/skills/` for scaffolding capabilities

---

## TL;DR - Quick Reference

| What | Command/Pattern |
|------|-----------------|
| **Dev server** | `npm run dev:website` or `npm run dev:api` |
| **Build** | `npm run build:website` or `npm run build:api` |
| **Test** | `npm run test:website` or `npm run test:unit` |
| **Format** | `npm run format` (Prettier) |
| **Lint** | `npm run lint` (ESLint with 20+ plugins) |
| **Generate** | `npm run generate` (env, i18n, GraphQL) |
| **Setup** | `npm run setup` (first-time workspace setup) |

**Key Patterns:**
- Server Components by default; add `"use client"` only when needed
- Use `@arolariu/components` for shared UI components
- Check `docs/rfc/` before architectural changes
- Follow DDD in backend (`sites/api.arolariu.ro/src/Invoices/`)
- TypeScript strict mode everywhere - no `any` types

---

## Agent Governance Contract (Mandatory)

Every AI asset in this repository (`instructions`, `agents`, `skills`, `prompts`) must follow this execution contract:

1. **Task Intake**
   - Restate task intent internally and identify affected domains.
   - Enumerate assumptions before implementing non-trivial changes.
2. **Constraint Gate**
   - Apply repository policies, security boundaries, and architecture constraints before editing files.
3. **RFC Grounding Trigger**
   - If task touches architecture, workflows, security, state management, observability, or public API contracts, read relevant RFCs from `docs/rfc/` and verify referenced source files.
4. **Verification Gate**
   - Do not claim success without command output or direct file evidence.
   - Run relevant existing validation commands for changed surfaces.
5. **Uncertainty Reporting**
   - Explicitly report unresolved assumptions, risk level, and required human decision points.

### Instruction Conflict Resolution Order

When rules overlap, apply the most specific instruction in this precedence:

1. Platform/system constraints (runtime safety + tool constraints)
2. Repository root governance (`.github/copilot-instructions.md`, `AGENTS.md`)
3. Domain instructions (`.github/instructions/*.instructions.md`)
4. Task artifacts (`.github/agents/*.agent.md`, `.github/skills/*/SKILL.md`, `.github/prompts/*.prompt.md`)
5. File-local conventions and examples

### Violation Severity Model

| Severity | Definition | Required Response |
|----------|------------|-------------------|
| **Critical** | Security, credential handling, destructive operations, policy bypass | Stop, surface blocker, request explicit user confirmation |
| **High** | Architecture/rule violations, unsupported claims, missing verification | Block completion until corrected |
| **Medium** | Partial standards drift, incomplete validation coverage | Fix before merge unless user explicitly defers |
| **Low** | Clarity/documentation improvements with no behavior risk | Queue for follow-up improvement |

### RFC Grounding Protocol

For architecture-sensitive tasks, follow `.github/agent-governance/rfc-grounding-protocol.md`.

- Trigger conditions: architecture, workflows, security, state, observability, metadata/SEO, shared component contracts, backend layering, and public API documentation changes.
- Always verify RFC claims against source files before implementation.
- If RFC and source disagree, source wins; log drift and include evidence in output.

### Self-Audit and Uncertainty Protocol

For non-trivial tasks, apply `.github/agent-governance/self-audit-protocol.md` before final output.

- Include assumptions, risk flags, confidence level, and evidence checklist.
- Escalate for user confirmation on security/auth/infra/destructive/behavior-shift changes.
- Never claim success without file/command evidence.

---

## Table of Contents

1. [TL;DR - Quick Reference](#tldr---quick-reference)
2. [Agent Governance Contract (Mandatory)](#agent-governance-contract-mandatory)
3. [Monorepo Architecture](#monorepo-architecture)
4. [Context-Aware Instructions](#context-aware-instructions)
5. [Documentation & Architecture RFCs](#documentation--architecture-rfcs)
6. [Technology Stack](#technology-stack)
7. [Code Quality Standards](#code-quality-standards)
8. [Frontend Development (Next.js)](#frontend-development-nextjs)
9. [Backend Development (.NET)](#backend-development-net)
10. [Shared Components Library](#shared-components-library)
11. [Type Safety & TypeScript](#type-safety--typescript)
12. [State Management](#state-management)
13. [Testing Practices](#testing-practices)
14. [Infrastructure & Deployment](#infrastructure--deployment)
15. [Naming Conventions](#naming-conventions)
16. [Performance Considerations](#performance-considerations)
17. [Security Guidelines](#security-guidelines)

---

## Monorepo Architecture

### Structure
This is an **Nx-based monorepo** with the following structure:

```
arolariu.ro/
├── packages/           # Shared libraries (libsDir)
│   └── components/     # React component library
├── sites/              # Applications (appsDir)
│   ├── arolariu.ro/    # Main Next.js website
│   ├── api.arolariu.ro/ # .NET backend API
│   ├── cv.arolariu.ro/  # SvelteKit CV site
│   ├── docs.arolariu.ro/ # DocFX documentation
│   └── exp.arolariu.ro/  # Python FastAPI experimental service
├── infra/              # Infrastructure as Code (Azure Bicep)
├── scripts/            # Build and utility scripts
└── nx.json             # Nx workspace configuration
```

### Key Commands
- **Build**: `npm run build` or `npm run build:website`
- **Dev**: `npm run dev` or `npm run dev:website`
- **Test**: `npm run test` or `npm run test:website`
- **Format**: `npm run format` (Prettier)
- **Lint**: `npm run lint` (ESLint)

### Nx Principles
- Projects declare their dependencies through `project.json`
- Nx caches build outputs for faster rebuilds
- Use `nx affected` to run tasks only on changed projects
- The component library (`@arolariu/components`) is a shared dependency

---

## Context-Aware Instructions

Copilot automatically loads specialized instructions based on the file you're editing. These are located in `.github/instructions/`:

| Instruction File | Applies To | Purpose |
|-----------------|-----------|---------|
| `agent-governance.instructions.md` | `.github/agents/**` | Agent governance rules |
| `backend.instructions.md` | `**/*.cs, **/*.csproj` | DDD, .NET architecture, XML docs |
| `bicep.instructions.md` | `**/*.bicep` | Azure IaC patterns |
| `code-review.instructions.md` | `**` | Code review guidelines |
| `components.instructions.md` | `packages/components/**` | Component library patterns |
| `csharp.instructions.md` | `**/*.cs` | C# coding standards |
| `frontend.instructions.md` | `sites/arolariu.ro/**` | Next.js App Router, RSC, observability |
| `python.instructions.md` | `**/*.py` | Python coding standards |
| `react.instructions.md` | `**/*.tsx, **/*.jsx` | React component patterns |
| `svelte.instructions.md` | `**/*.svelte` | SvelteKit patterns |
| `typescript.instructions.md` | `**/*.ts` | TypeScript 6.x best practices |
| `workflows.instructions.md` | `.github/workflows/*.yml` | GitHub Actions CI/CD |

**Prompts** are available in `.github/prompts/` for common tasks like documentation generation.

---

## Documentation & Architecture RFCs

### Documentation Structure
The `docs/` directory contains comprehensive documentation about the system architecture, design decisions, and best practices:

```
docs/
├── README.md              # Documentation index
├── RFC_TEMPLATE.md        # Template for new RFCs
├── backend/               # Backend-specific documentation
│   └── README.md
├── frontend/              # Frontend-specific documentation
│   └── README.md
└── rfc/                   # Request for Comments (architectural decisions)
    ├── 0001-github-actions-workflows.md
    ├── 1001-opentelemetry-observability-system.md
    ├── 1002-comprehensive-jsdoc-documentation-standard.md
    ├── 1003-internationalization-system.md
    ├── 1004-metadata-seo-system.md
    ├── 1005-state-management-zustand.md
    ├── 1006-component-library-architecture.md
    ├── 1007-advanced-frontend-patterns.md
    ├── 1008-scss-system-architecture.md
    ├── 2001-domain-driven-design-architecture.md
    ├── 2002-opentelemetry-backend-observability.md
    ├── 2003-the-standard-implementation.md
    └── 2004-comprehensive-xml-documentation-standard.md
```

### Understanding the System Through RFCs

**Always consult the RFC documents** when working on significant features or architectural changes. RFCs are numbered by domain:
- **0xxx**: Infrastructure & DevOps (workflows, deployment)
- **1xxx**: Frontend architecture (observability, i18n, SEO, JSDoc)
- **2xxx**: Backend architecture (DDD, observability, XML docs)

#### Key Frontend RFCs (1xxx series)
| RFC | Topic | Key Files |
|-----|-------|-----------|
| 1001 | OpenTelemetry Observability | `src/lib/telemetry.ts`, `src/instrumentation.ts` |
| 1002 | JSDoc/TSDoc Documentation Standard | All `*.ts`/`*.tsx` files |
| 1003 | Internationalization (i18n) | `src/i18n/`, `messages/*.json` |
| 1004 | Metadata & SEO System | `src/metadata.ts`, `app/**/page.tsx` |
| 1005 | State Management (Zustand) | `src/stores/`, `src/stores/createEntityStore.ts` |
| 1006 | Component Library Architecture | `packages/components/src/` |
| 1007 | Advanced Frontend Patterns | `src/stores/`, `src/lib/utils.server.ts` |

#### Key Backend RFCs (2xxx series)
| RFC | Topic | Key Files |
|-----|-------|-----------|
| 2001 | Domain-Driven Design Architecture | `src/Invoices/DDD/` bounded contexts |
| 2002 | Backend OpenTelemetry | Telemetry middleware, spans |
| 2003 | The Standard Implementation | SOLID principles, clean architecture |
| 2004 | XML Documentation Standard | All `*.cs` public APIs |

### RFC Process

When making architectural changes:

1. **Read Relevant RFCs**: Check if existing RFCs document patterns or decisions
2. **Follow Established Patterns**: Use the same architectural approaches documented in RFCs
3. **Document New Decisions**: Significant architectural changes should result in new RFCs
4. **Use RFC Template**: `docs/RFC_TEMPLATE.md` provides the structure for new RFCs

### Key Architectural Principles from RFCs

#### From Frontend RFCs (1xxx)
- **Type Safety First**: Use strongly-typed telemetry APIs (RFC 1001)
- **Context Awareness**: Distinguish between server/client/edge execution contexts (RFC 1001)
- **Documentation as Code**: JSDoc comments are mandatory for public APIs (RFC 1002)
- **i18n by Default**: All user-facing strings use `next-intl` (RFC 1003)
- **SEO Optimized**: Every page has proper metadata via `createMetadata()` (RFC 1004)

#### From Backend RFCs (2xxx)
- **Ubiquitous Language**: Code terminology matches business domain (RFC 2001)
- **Rich Domain Models**: Business logic belongs in domain entities (RFC 2001)
- **Bounded Contexts**: Clear separation between domains (RFC 2001)
- **Observable by Default**: All operations emit telemetry spans (RFC 2002)
- **SOLID Principles**: Follow The Standard architecture patterns (RFC 2003)
- **Testability**: 85%+ test coverage with clear boundaries (RFC 2001)

### When to Consult Documentation

- **Before implementing new features**: Understand existing patterns
- **When encountering unfamiliar code**: Check if an RFC explains the design
- **During code reviews**: Validate adherence to documented architecture
- **When debugging**: RFCs provide context on why systems work the way they do

---

## Technology Stack

### Frontend (sites/arolariu.ro)
- **Framework**: Next.js 16.2 (App Router)
- **React**: v19.2.4 (with React Server Components)
- **TypeScript**: v6.0 (strict mode)
- **Styling**: Tailwind CSS v4.2 + PostCSS
- **UI Components**: Base UI + CSS Modules
- **State Management**: Zustand v5.0.12 (4 stores with IndexedDB persistence)
- **Authentication**: Clerk (@clerk/nextjs v7.0)
- **Internationalization**: next-intl v4.9.0
- **Forms**: react-hook-form + zod validation
- **Testing**: Vitest v4.1.2 + Playwright

### Backend (sites/api.arolariu.ro)
- **Framework**: .NET 10.0 (LTS)
- **Architecture**: Modular Monolith with Domain-Driven Design
- **Domains**: General (infrastructure), Invoices (business), Auth
- **Testing**: xUnit

### Shared Components (packages/components)
- **Build Tool**: RSLib v0.20 + Rsbuild
- **Documentation**: Storybook v10.3
- **Components**: Base UI + CSS Modules components

### CV Site (sites/cv.arolariu.ro)
- **Framework**: SvelteKit v2.56
- **Adapter**: Azure Static Web Apps

---

## Code Quality Standards

- **ESLint**: 20+ plugins (typescript-eslint, react, sonarjs, security, jsx-a11y, jsdoc, etc.) — see `eslint.config.ts`
- **TypeScript**: Strictest settings (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Prettier**: v3.8 with organize-imports, svelte plugins

> **Details**: See `typescript.instructions.md` for TypeScript configuration and `react.instructions.md` for React/JSX rules.

---

## Frontend Development (Next.js)

**Core principles**: Server Components by default, `"use client"` only when needed, Island pattern for interactivity, `next-intl` for all user-facing strings, `createMetadata()` for SEO on every page.

**Key directories**: `src/app/` (App Router), `src/hooks/` (custom hooks), `src/stores/` (Zustand), `src/lib/actions/` (Server Actions), `src/types/` (TypeScript types), `src/contexts/` (React Contexts).

> **Full patterns & examples**: See `frontend.instructions.md` for RSC patterns, i18n, metadata, file organization, and component architecture. See `react.instructions.md` for hooks, memoization, context, and accessibility patterns.

---

## Backend Development (.NET)

**Architecture**: Modular Monolith with The Standard (Brokers → Foundation → Orchestration → Processing → Endpoints). Florance Pattern limits dependencies to 2-3 per service.

**Bounded Contexts**: General (infrastructure), Invoices (business logic), Auth (authentication). Each context uses domain extension methods for `WebApplicationBuilder`/`WebApplication` configuration.

**Requirements**: XML documentation on all public APIs, `.ConfigureAwait(false)` in library code, TryCatch pattern with OpenTelemetry tracing.

> **Full patterns & examples**: See `backend.instructions.md` for DDD patterns, layer architecture, and project structure. See `csharp.instructions.md` for C# coding standards, naming, and language features.

---

## Shared Components Library

**Package**: `@arolariu/components` — Base UI components with CSS Modules, exported via barrel in `src/index.ts`. Use `cn()` for class merging, `forwardRef` for DOM refs.

> **Full patterns & examples**: See `components.instructions.md` for component creation, Storybook stories, and extension patterns.

---

## Type Safety & TypeScript

**Zero `any` tolerance.** Use `unknown` + type guards, generics, and discriminated unions. All public APIs need explicit return types. Use `import type` for type-only imports (`verbatimModuleSyntax` enforced).

**Domain types** live in `src/types/` with DDD patterns (`BaseEntity<T>`, `NamedEntity<T>`, `Invoice`, `Product`, etc.).

> **Full patterns & examples**: See `typescript.instructions.md` for strict mode implications, type guard patterns, and typed environment variables.

---

## State Management

### Zustand Stores

The project has **4 Zustand stores** in `src/stores/`, all using IndexedDB persistence via Dexie:

| Store | File | Persisted State | Notes |
|-------|------|-----------------|-------|
| `useInvoicesStore` | `invoicesStore.tsx` | `invoices[]` | Hand-rolled (custom fields/actions) |
| `useMerchantsStore` | `merchantsStore.tsx` | `merchants[]` | Hand-rolled |
| `useScansStore` | `scansStore.tsx` | `entities[]` | Uses `createEntityStore` factory |
| `usePreferencesStore` | `preferencesStore.ts` | `theme`, `font`, `locale`, etc. | UI preferences, separate schema |

**Key patterns**: Always import from barrel `@/stores`, use `useShallow` for object selectors, use `ServerActionResult<T>` for server action return types. State hierarchy: Zustand (global) → React Context (scoped) → useState (local).

> **Full patterns & examples**: See `frontend.instructions.md` for store usage, `createEntityStore` factory, `ServerActionResult<T>`, and Context patterns.

---

## Testing Practices

| Domain | Framework | Coverage | Command |
|--------|-----------|----------|---------|
| Frontend unit | Vitest + Testing Library | 90%+ | `npm run test:website` |
| Frontend E2E | Playwright | Critical paths | `npm run test:e2e:frontend` |
| Backend unit | xUnit + MSTest | 85%+ | `dotnet test sites/api.arolariu.ro/tests` |
| Backend E2E | Newman/Postman | API contracts | `npm run test:e2e:backend` |

**Conventions**: Use `.test.` suffix for Vitest (`.spec.` is reserved for Playwright). Follow AAA pattern (Arrange, Act, Assert). Use mock builders (`InvoiceBuilder`, `ProductBuilder`) and cleanup in `afterEach`.

```bash
# Single file (Vitest)
npx vitest run src/lib/utils.generic.test.ts
# Single .NET test
dotnet test --filter "MethodName_Condition_ExpectedResult"
# Coverage
npm run test:unit
```

---

## Infrastructure & Deployment

- **Hosting**: Azure App Service (containerized) with Azure Front Door CDN
- **Databases**: Azure SQL + Cosmos DB
- **Storage/Secrets**: Azure Blob Storage, Key Vault, App Configuration
- **Monitoring**: Application Insights + OpenTelemetry
- **IaC**: Bicep templates in `infra/Azure/Bicep/`
- **Containers**: Multi-stage Docker builds (Node 24 / .NET 10)
- **Environment Variables**: Type-safe via `TypedEnvironment`, secrets in Key Vault, `.env.local` for local dev (gitignored)

> **Full patterns & examples**: See `bicep.instructions.md` for Azure IaC patterns and `workflows.instructions.md` for CI/CD pipelines.

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `Button.tsx`, `UserProfile.tsx` |
| Utilities | camelCase | `utils.client.ts`, `formatDate.ts` |
| Types | PascalCase | `Invoice.ts`, `Product.ts` |
| Hooks | camelCase + `use` prefix | `useInvoice.tsx` |
| Contexts | PascalCase + `Context` suffix | `FontContext.tsx` |
| Route folders | kebab-case | `view-invoice/`, `create-invoice/` |
| Variables/functions | camelCase | `invoiceTotal`, `processPayment()` |
| Types/interfaces/enums | PascalCase | `UserRole`, `PaymentType` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `API_TIMEOUT_MS` |
| React exports | Named for components, default for pages | `export function Button()`, `export default function HomePage()` |

> **Backend naming**: See `csharp.instructions.md` for C#-specific naming (PascalCase classes, `I` prefix interfaces, `Method_Condition_Expected` tests).

---

## Performance Considerations

- **Code splitting**: Use `dynamic()` imports with `{ssr: false}` for heavy client components
- **Memoization**: `memo` for expensive renders, `useMemo`/`useCallback` when props are stable
- **Images**: Always use Next.js `<Image>` with explicit dimensions, `priority` for above-the-fold
- **Bundle analysis**: `ANALYZE=true npm run build:website`

> **Full patterns**: See `react.instructions.md` for memoization guidelines and `frontend.instructions.md` for Next.js optimization.

---

## Security Guidelines

- **Authentication**: Clerk (`@clerk/nextjs`) — use `auth()` / `currentUser()` server-side, never check in-component
- **CSP**: Strict Content Security Policy configured in `next.config.ts`
- **Input validation**: Zod schemas for all form/API inputs — validate before processing
- **Secrets**: Never commit to VCS; use Azure Key Vault for production, `.env.local` for local dev
- **Environment variables**: Validate at startup, mark sensitive vars in `SecretEnvironmentVariablesType`

> **Review standards**: See `code-review.instructions.md` for security review criteria.

---

## Additional Guidelines

- **Documentation**: JSDoc on all public TS APIs (RFC 1002), XML docs on all public C# APIs (RFC 2004)
- **Error handling**: Use `ServerActionResult<T>` pattern for server actions, TryCatch pattern for .NET services
- **Accessibility**: Semantic HTML, `alt` text, keyboard navigation, WCAG 2.1 AA, `jsx-a11y` strict mode
- **Imports**: Group by external → internal (`@/`) → types → relative

---

## Quick Reference

### Common Imports
```typescript
// Next.js
import {redirect, notFound} from "next/navigation";
import {revalidatePath, revalidateTag} from "next/cache";
import Image from "next/image";
import Link from "next/link";

// React
import {useState, useEffect, useMemo, useCallback, memo} from "react";

// Components
import {Button, Card, CardContent} from "@arolariu/components";
import {cn} from "@/lib/utils";

// State
import {useInvoicesStore, useMerchantsStore, useScansStore, usePreferencesStore} from "@/stores";
```

### Import Order
1. External dependencies (React, Next.js, etc.)
2. Internal dependencies (`@/` imports)
3. Types
4. Relative imports

---

## Summary

When working with this codebase:

1. **Consult the documentation** - Always check `docs/rfc/` for architectural decisions and patterns before making significant changes
2. **Follow the monorepo structure** - Use Nx commands and respect project boundaries
3. **Embrace strict typing** - TypeScript strict mode is non-negotiable
4. **Prefer Server Components** - Use Client Components only when needed
5. **Write comprehensive tests** - Unit, integration, and E2E coverage
6. **Document public APIs** - Use JSDoc/XML doc comments
7. **Follow DDD principles** - Respect domain boundaries in the backend
8. **Optimize for performance** - Use memo, lazy loading, and code splitting
9. **Prioritize security** - Validate inputs, sanitize outputs, use CSP
10. **Maintain accessibility** - Follow WCAG standards and semantic HTML
11. **Keep code consistent** - ESLint and Prettier enforce the rules

This is a modern, enterprise-grade monorepo with high standards for code quality, type safety, and architectural patterns. All contributions should align with these established practices.
