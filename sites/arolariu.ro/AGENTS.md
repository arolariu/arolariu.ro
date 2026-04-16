# Frontend Agent Guide (arolariu.ro)

> Next.js 16.2 + React 19.2.4 + TypeScript 6.0

## Architecture

- **Server Components by default** — only add `"use client"` when state/interactivity is needed
- **Island Pattern**: `page.tsx` (RSC) → `island.tsx` (Client) → `_components/` (local)
- **State hierarchy**: Zustand (global) → Context (scoped) → useState (local)

## Commands

```bash
npm run dev:website        # Dev server → http://localhost:3000
npm run build:website      # Production build
npm run test:website       # Vitest unit tests
npm run lint               # ESLint (20+ plugins)
npm run format             # Prettier
npm run generate           # Generate env, i18n, GraphQL types
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages (RSC by default) |
| `src/stores/` | Zustand stores (invoices, merchants, scans, preferences) |
| `src/hooks/` | Custom hooks (useInvoice, useMerchants, etc.) |
| `src/lib/actions/` | Server Actions |
| `src/types/` | TypeScript type definitions |
| `messages/` | i18n translations (en.json, ro.json, fr.json) |

## Rules

- Zero `any` types — TypeScript strict mode enforced
- All user-facing strings through `next-intl`
- Import shared UI from `@arolariu/components`
- Use `Readonly<Props>` for all component props
- `useShallow` for Zustand object selectors
- 90%+ test coverage target

## RFCs

Consult before architectural changes: 1001 (observability), 1002 (JSDoc), 1003 (i18n), 1004 (metadata/SEO), 1005 (Zustand), 1006 (component library), 1007 (patterns), 1008 (SCSS)
