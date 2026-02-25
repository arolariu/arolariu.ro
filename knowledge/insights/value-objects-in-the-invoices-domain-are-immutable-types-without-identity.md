---
description: "PaymentInformation, Recipe, Allergen, and product-centric VOs live under Invoices/DDD/ValueObjects/ and are compared by value, never by ID"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Value objects in the invoices domain are immutable types without identity

The Invoices bounded context distinguishes between entities (which have identity via `BaseEntity<T>.id`) and value objects (which have no identity and are compared by structural equality). Value objects live under `Invoices/DDD/ValueObjects/` and currently include `PaymentInformation`, `Recipe`, `Allergen`, and a set of product-centric value objects under `ValueObjects/Products/`. These types represent descriptive aspects of the domain that are fully defined by their attributes rather than by a unique identifier.

Since value objects carry no `id` property and do not inherit from `BaseEntity<T>`, they cannot be independently persisted or referenced by other aggregates. They exist only as owned state within an aggregate root. For example, `PaymentInformation` describes how an invoice was paid, and `Recipe` describes a possible recipe derived from purchased items. Replacing one value object instance with another that has identical properties is semantically equivalent -- there is no "identity" to preserve. This immutability and value-equality rule means value objects are safe to share across threads and safe to cache without defensive copying.

New value objects should be added under the appropriate subdirectory of `ValueObjects/` and should never be given an `id` property or registered as independent entities in the Cosmos DB container.

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — foundation: the aggregate that owns these value objects as internal state
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] — contradicts: value objects deliberately bypass the entity inheritance chain
- [[ddd-folder-structure-mirrors-tactical-patterns-within-each-bounded-context]] — convention: the ValueObjects/ directory that houses these types

Domains:
- [[backend-architecture]]
