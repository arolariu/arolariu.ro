# Frontend Documentation

Source-grounded documentation for the main Next.js website and shared React
component library.

Root `AGENTS.md` owns runtime/framework versions, commands, and repository-wide
testing policy. The website/component local guides and live source own current
behavior; accepted RFCs record intent.

## Architecture

The website uses the App Router with Server Components by default:

```text
page.tsx / layout.tsx
  -> private server reads, metadata, access decisions
  -> smallest serializable handoff
     -> island.tsx / Client Component
        -> route-local components and Hooks
```

- Add `"use client"` only for Hooks, events, browser APIs, client Context,
  Zustand, or framework-required client artifacts.
- Use private `"server-only"` helpers for server-owned reads.
- Reserve `"use server"` exports for operations the browser invokes; treat
  them as public RPC boundaries.
- Use URL state first when behavior is bookmarkable, shareable, or
  navigation-owned. Otherwise keep state at the narrowest owner: derived
  render value, local state, scoped Context, an existing store, then an
  approved new Zustand boundary.
- Use `next-intl-selector` callbacks for typed messages.
- Build page metadata through `createMetadata`.
- Use CSS Modules for website styling and `@arolariu/components` for shared
  domain-agnostic primitives.

## Current RFCs

| RFC | Status | Responsibility |
| --- | --- | --- |
| [1001](../rfc/1001-opentelemetry-observability-system.md) | Implemented | Frontend tracing and telemetry |
| [1002](../rfc/1002-comprehensive-jsdoc-documentation-standard.md) | Implemented | JSDoc/TSDoc contracts |
| [1003](../rfc/1003-internationalization-system.md) | Implemented | Typed i18n and locale schema |
| [1004](../rfc/1004-metadata-seo-system.md) | Implemented | Metadata and SEO |
| [1005](../rfc/1005-state-management-zustand.md) | Implemented | Zustand and IndexedDB persistence |
| [1006](../rfc/1006-component-library-architecture.md) | Implemented | Shared component architecture |
| [1007](../rfc/1007-advanced-frontend-patterns.md) | Implemented | Entity stores, server results, dialogs |
| [1008](../rfc/1008-scss-system-architecture.md) | Implemented | Website styling architecture |

## Practical guides

- [Internationalization](./i18n-guide.md)
- [Metadata and SEO](./metadata-guide.md)
- [JSDoc/TSDoc](./jsdoc-guide.md)
- [Frontend OpenTelemetry](./opentelemetry-guide.md)

Generated TypeScript reference is published by the documentation site under
`/reference/typescript/website/`. It is generated from live source comments
and must not be edited directly.

## Testing

Website unit/component/hook tests use Vitest and Testing Library. Playwright
owns browser navigation and critical user journeys. The root Newman frontend
suite is a separate HTTP contract surface.

Tests should:

- assert user/public outcomes rather than internals;
- use roles, accessible names, keyboard/focus behavior, and exact result
  contracts;
- execute repository modules and substitute only true external boundaries;
- cover loading, error, empty, hydration, cleanup, and transport validation
  when those behaviors change.

## Live owners

- `sites/arolariu.ro/AGENTS.md`
- `.github/instructions/frontend.instructions.md`
- `.github/instructions/react.instructions.md`
- `.github/instructions/typescript.instructions.md`
- `sites/arolariu.ro/src/app/`
- `sites/arolariu.ro/src/lib/`
- `sites/arolariu.ro/src/stores/`
- `sites/arolariu.ro/messages/`
- `packages/components/AGENTS.md`

Use the matching React or `code-*` skill for implementation; commands are
intentionally not copied here.
