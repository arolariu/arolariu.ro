---
description: "Execution Context, Authentication, Side Effects, and Error Handling must appear in every server action's @remarks to make the implicit server boundary explicit"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# Server actions require four documented sections in remarks

Next.js server actions look like regular async functions but execute in a fundamentally different context — server-side only, with automatic serialization of return values and implicit network boundaries. This codebase mandates four specific sections in every server action's `@remarks` block: **Execution Context** (confirming server-side execution), **Authentication** (what credentials are required), **Side Effects** (database writes, external API calls, cache invalidation), and **Error Handling** (what errors can be thrown and how clients should handle them).

This four-section template exists because server actions are uniquely dangerous to under-document. A developer calling a server action from a Client Component sees only the function signature — they cannot inspect the implementation without navigating to the source file. The JSDoc becomes the API contract for a cross-boundary call. Missing authentication documentation means the caller might forget to pass credentials. Missing side effect documentation means the caller might not know to invalidate a cache or update UI state.

The template mirrors the documentation approach used for backend API endpoints, creating consistency between the frontend's server actions and the .NET backend's endpoint documentation (RFC 2004). Both treat their public surface as API contracts requiring explicit security, effect, and error documentation.

---

Related Insights:
- [[every-react-component-jsdoc-must-declare-its-rendering-context]] — extends: server actions are another case where execution context must be explicit
- [[jsdoc-param-tags-document-domain-constraints-beyond-typescript-types]] — extends: param tags on server actions carry the same constraint semantics

Domains:
- [[frontend-patterns]]
