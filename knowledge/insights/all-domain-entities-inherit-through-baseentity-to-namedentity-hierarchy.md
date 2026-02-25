---
description: "BaseEntity<T> defines id via abstract property, NamedEntity<T> adds Name and Description, concrete entities like Invoice and Merchant are sealed"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# All domain entities inherit through BaseEntity to NamedEntity hierarchy

The codebase enforces a two-level entity inheritance chain defined in the Common bounded context's DDD contracts. `BaseEntity<T>` is the abstract root, defining `id` as an abstract `init`-only property typed by the generic parameter (typically `Guid`). `NamedEntity<T>` extends `BaseEntity<T>` by adding `Name` and `Description` string properties. All concrete domain entities — `Invoice`, `Merchant`, etc. — inherit from `NamedEntity<Guid>` and are declared `sealed` to prevent further inheritance.

The `sealed` keyword on concrete entities enforces Liskov Substitution: any code accepting `NamedEntity<Guid>` or `BaseEntity<Guid>` works correctly with any concrete entity. The `init`-only `id` property ensures identity is set at construction and never mutated, which is fundamental to DDD identity semantics. New domain entities must follow this chain — creating an entity that bypasses `NamedEntity` or `BaseEntity` would break the shared infrastructure built around these base types (serialization, repository generics, telemetry attributes).

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — example: Invoice follows this hierarchy as NamedEntity<Guid>
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: Common owns these base classes shared across contexts

Domains:
- [[backend-architecture]]
