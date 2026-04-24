# RFCs

Architecture and design decision records for the arolariu.ro monorepo.
Each RFC captures one durable decision — the problem it solved, the options
considered, and what landed.

## How to add a new RFC

1. Copy [`RFC_TEMPLATE.md`](../RFC_TEMPLATE.md) into `docs/rfc/` with a fresh
   number (e.g. `2002-<short-slug>.md`). Numbering convention:
   - `0xxx` — process / CI / governance
   - `1xxx` — frontend
   - `2xxx` — backend
2. Fill in `Status`, `Context`, `Decision`, `Consequences`.
3. Open a PR against `main`. The docs site re-mirrors `docs/` on every build,
   so your RFC appears in the sidebar automatically once merged.

## Index

### Process

- [0001 — GitHub Actions workflows](./0001-github-actions-workflows.md)

### Frontend

- [1001 — OpenTelemetry observability system](./1001-opentelemetry-observability-system.md)
- [1002 — Comprehensive JSDoc documentation standard](./1002-comprehensive-jsdoc-documentation-standard.md)
- [1003 — Internationalization system](./1003-internationalization-system.md)
- [1004 — Metadata & SEO system](./1004-metadata-seo-system.md)
- [1005 — State management (Zustand)](./1005-state-management-zustand.md)
- [1006 — Component library architecture](./1006-component-library-architecture.md)
- [1007 — Advanced frontend patterns](./1007-advanced-frontend-patterns.md)
- [1008 — SCSS system architecture](./1008-scss-system-architecture.md)

### Backend

- [2001 — Domain-Driven Design architecture](./2001-domain-driven-design-architecture.md)
- [2002 — OpenTelemetry backend observability](./2002-opentelemetry-backend-observability.md)
- [2003 — The Standard implementation](./2003-the-standard-implementation.md)
- [2004 — Comprehensive XML documentation standard](./2004-comprehensive-xml-documentation-standard.md)
