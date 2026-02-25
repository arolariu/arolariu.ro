---
description: "Zustand hooks require 'use client' directive; Server Components fetch data and pass it as props to client islands that own the store interaction"
type: constraint
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Zustand stores live exclusively in client island components

Zustand stores are React hooks, and hooks can only execute in client components. In the Island architecture pattern used throughout the codebase, `page.tsx` files are Server Components responsible for data fetching, metadata, and SEO, while `island.tsx` files are Client Components marked with `"use client"` that handle interactivity and state. This means all Zustand store access -- reading state, dispatching actions, checking hydration -- must happen inside island components or their child trees, never in page-level Server Components.

This constraint shapes the data flow: the server component fetches initial data (e.g., `await fetchInvoices()`), passes it as props to the client island, and the island merges that server data into the Zustand store after hydration completes. The server component never reads from the store because server-side rendering has no access to the browser's IndexedDB. The store is purely a client-side concern.

This separation also means Zustand stores require no Provider component wrapping. Unlike React Context, which needs a Provider in the component tree, Zustand stores are module-level singletons. Any client component can import and call `useInvoicesStore()` without checking that a provider exists above it. This eliminates a common source of "missing provider" runtime errors in RSC-heavy applications.

---

Related Insights:
- [[server-data-merges-into-zustand-store-after-hydration-completes]] -- extends: describes the server-to-client data handoff this constraint requires
- [[store-naming-follows-use-entity-store-convention-with-camelcase]] -- convention: the naming pattern for these client-only hooks
- [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards]] -- enables: the hydration guard is needed because the store initializes empty in the client

Domains:
- [[frontend-patterns]]
