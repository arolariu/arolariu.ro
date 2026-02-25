---
description: "Types handle structural correctness (string, number, interface shape); JSDoc handles semantic correctness (valid UUIDs, positive values, rendering context, design rationale)"
type: decision
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# TypeScript types express shape while JSDoc expresses intent and constraints

The core documentation philosophy of this codebase is that TypeScript and JSDoc serve complementary, non-overlapping roles. TypeScript types answer "what shape does this data have?" — string, number, interface fields, generic constraints. JSDoc answers "what does this mean, why does it exist, when should it be used, and what constraints apply?" — domain validation rules, architectural rationale, rendering context, trade-offs considered.

This division has a concrete enforcement rule: JSDoc `@param` tags in TypeScript files must never repeat the type annotation (since VS Code and TypeDoc already display it from the TypeScript signature). Instead, they must add constraint information that the type system cannot express. A parameter typed as `string` might require UUIDv4 format. A parameter typed as `number` might require positivity. An optional parameter might have specific fallback behavior when omitted.

The decision also shapes what goes in `@remarks` versus what goes in type definitions. When a union type like `UploadStatus` has values like `"PENDING__CLIENTSIDE"` and `"SUCCESS__SERVERSIDE"`, the TypeScript type shows the valid values but `@remarks` explains the two-phase client/server pattern they represent. This separation means developers relying on IntelliSense get both structural and semantic understanding without either system duplicating the other's work.

---

Related Insights:
- [[jsdoc-param-tags-document-domain-constraints-beyond-typescript-types]] — extends: the specific mechanism for parameter-level constraint documentation
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — example: telemetry types push some constraints into the type system, but JSDoc still carries the rest
- [[every-react-component-jsdoc-must-declare-its-rendering-context]] — extends: rendering context is a prime example of intent that types cannot express

Domains:
- [[frontend-patterns]]
