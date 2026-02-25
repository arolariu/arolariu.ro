---
description: "Server Component, Client Component, or Edge must appear in @remarks so developers instantly know the execution environment and its constraints"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# Every React component JSDoc must declare its rendering context

In a Next.js App Router codebase where Server Components are the default and Client Components require explicit `"use client"` directives, the rendering context of a component determines what APIs are available, whether hooks can be used, and how data flows. This codebase requires every React component's JSDoc `@remarks` block to include a **Rendering Context** section stating one of: Server Component, Client Component, or Edge.

This convention exists because the `"use client"` directive is easy to miss when scanning code, and its absence (meaning Server Component) carries implicit constraints that are not visible in the function signature. A Server Component cannot use `useState` or `useEffect`, can use `await` for data fetching, and runs only on the server. Declaring this in JSDoc makes the execution model explicit at the documentation level, not just at the directive level.

The convention also supports the project's Island pattern architecture, where `page.tsx` files are Server Components and `island.tsx` files are Client Components. By documenting rendering context in JSDoc, the pattern is reinforced through documentation, not just file naming.

---

Related Insights:
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] — extends: the telemetry system also partitions by these same rendering contexts
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — foundation: rendering context is an intent constraint that types alone cannot express

Domains:
- [[frontend-patterns]]
