---
description: "Next.js Server Components and Server Actions act as a BFF layer, handling SSR, auth, and data shaping before forwarding to the .NET API"
type: pattern
source: "owner knowledge"
status: current
created: 2026-02-25
---

# Next.js serves as backend-for-frontend bridging React UI and .NET API

The Next.js application at `sites/arolariu.ro/` is not just a frontend — it functions as a Backend For Frontend (BFF) layer. Server Components fetch data, Server Actions handle mutations, and middleware manages authentication via Clerk, all before any request reaches the .NET backend at `sites/api.arolariu.ro/`.

This architectural choice means the .NET API can focus purely on domain logic (The Standard's 5-layer architecture) without concern for UI-specific data shaping, session management, or rendering context. The BFF layer handles: locale resolution, metadata composition, auth token forwarding, response transformation for UI consumption, and caching strategies appropriate for the web tier.

The implication is that adding a new feature often requires changes in both layers — the BFF (Next.js Server Actions, data fetching in RSC pages) and the domain API (.NET endpoints, services, brokers). The dependency flows one direction: Next.js calls .NET, never the reverse.

---

Related Insights:
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — extends: the BFF layer's error handling pattern
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — extends: observability across the BFF boundary
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — foundation: what the .NET API exposes to the BFF
- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] — enables: unified observability across both layers
- [[dual-translation-api-maps-to-the-island-pattern]] — extends: i18n is handled in the BFF layer, not the API
- [[server-components-fetch-data-and-server-actions-mutate-keeping-a-slim-bff-barrier]] — extends: the slim-barrier convention that keeps the BFF layer thin

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
