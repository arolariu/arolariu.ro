---
description: "Components use forwardRef and event handlers making them client-side; they belong in island.tsx files (client components) not in RSC page.tsx files"
type: dependency
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Component library provides client-side primitives consumed by Island pattern

The @arolariu/components library produces components that are inherently client-side: they use `React.forwardRef`, attach event handlers, manage internal state (Radix primitives track open/closed, focus, selection), and rely on browser APIs for accessibility features like focus trapping. This means they cannot be rendered directly in React Server Components -- they must live inside `"use client"` boundaries.

In the arolariu.ro frontend, the Island pattern (from RFC 1007) separates each route into a `page.tsx` Server Component (data fetching, metadata, SEO) and an `island.tsx` Client Component (interactivity, state, event handlers). Component library imports belong exclusively in island files and their sub-components (`_components/`), never in page files. A `page.tsx` that imports a Dialog or Button would trigger a build error because Server Components cannot render client-side hooks.

This creates a clear architectural boundary: the component library is the "how things look and behave" layer that the Island pattern's client boundary consumes. Server Components handle "what data to show" and pass it as props into islands, which render it using library components. The dependency flow is unidirectional: `page.tsx` renders `island.tsx`, which imports from `@arolariu/components`.

---

Related Insights:
- [[radix-ui-primitives-provide-accessibility-foundation-for-all-interactive-components]] -- foundation: Radix primitives require client-side execution
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] -- extends: components execute in the 'client' render context

Domains:
- [[component-library]]
- [[frontend-patterns]]
