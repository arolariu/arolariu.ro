---
description: "TypeScript shows 'id: string' but @param adds 'Must be a valid UUIDv4' — JSDoc carries constraint semantics that the type system cannot express"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# JSDoc param tags document domain constraints beyond TypeScript types

TypeScript type annotations express structural shape — `id: string`, `amount: number` — but cannot express domain constraints like "must be a valid UUIDv4 string" or "must be positive" or "optional; returns empty string if not provided." This codebase uses `@param` JSDoc tags to fill that semantic gap, treating them as the place where domain-level validation requirements, valid value ranges, and nullability semantics are recorded.

The convention is enforced by `eslint-plugin-jsdoc` with `require-param` set to `error`, meaning every function parameter must have a corresponding `@param` tag. But the convention goes further than just presence: descriptions must specify constraints, valid values, default behavior, and relationships to other parameters. For example, `@param dateString - The date string or Date object to format. Optional; returns empty string if not provided` documents behavior that the TypeScript signature `dateString?: string | Date` alone does not convey.

This approach complements the type system rather than duplicating it. JSDoc `@param` tags in this codebase never repeat the TypeScript type (since TypeDoc and IntelliSense already display it). Instead, they add the constraint layer that makes the API contract fully specified.

---

Related Insights:
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — foundation: the overarching principle this convention implements
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — enables: lint rules guarantee @param tags exist for every parameter
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — example: telemetry uses both TS types and JSDoc constraints for span parameters

Domains:
- [[frontend-patterns]]
