---
description: "Major modules require @fileoverview with purpose, capability list, @module name, cross-references, and usage examples — providing architectural orientation before reading individual exports"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# Fileoverview tags provide module-level architectural context

Individual function and type JSDoc explains the pieces, but `@fileoverview` explains the whole. This codebase requires major modules to include a `@fileoverview` JSDoc block at the top of the file that documents the module's purpose, lists its capabilities, declares a `@module` name, cross-references related modules via `@see`, and provides initialization or usage examples.

The convention serves a navigation purpose that individual export documentation cannot. When a developer opens a file like `instrumentation.server.ts` or `utils.client.ts`, the `@fileoverview` immediately answers "what does this module do, what are its boundaries, and how does it fit into the architecture?" This is especially valuable in a Next.js codebase where file conventions (route files, middleware, instrumentation hooks) carry implicit framework semantics that may not be obvious to developers unfamiliar with the App Router.

Client-only modules receive a specific callout in `@fileoverview` warning that all functions will throw in server/edge environments. This environment-boundary documentation prevents runtime errors when code is accidentally imported in the wrong rendering context — a common pitfall in Next.js applications where the server/client boundary is not always visually obvious.

---

Related Insights:
- [[every-react-component-jsdoc-must-declare-its-rendering-context]] — extends: fileoverview serves the same rendering-context purpose at module scope
- [[jsdoc-cross-references-link-code-to-rfcs-and-framework-docs]] — enables: @fileoverview is a natural place for architectural cross-references

Domains:
- [[frontend-patterns]]
