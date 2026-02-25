---
description: "Invoice aggregate contains UserIdentifier, MerchantReference, Scans, PaymentInformation, Items, PossibleRecipes, and AdditionalMetadata as owned state"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Invoice is the primary aggregate root owning scans, payments, items, and recipes

The `Invoice` class is the central aggregate root in the Invoices bounded context, located at `Invoices/DDD/AggregatorRoots/Invoices/Invoice.cs`. It owns a rich set of state: `UserIdentifier` (binding it to a user), `MerchantReference` (linking to the Merchant entity), `Scans` (image/document captures), `PaymentInformation` (a value object), `Items` (line items/products), `PossibleRecipes` (derived from purchased items), and `AdditionalMetadata`. The Invoice enforces its invariants — for example, creation with empty products throws an `ArgumentException`.

`Merchant` is a referenced entity (not owned by Invoice), located at `Invoices/DDD/Entities/Merchants/Merchant.cs`. It carries its own identity with category, structured contact information, parent company linkage, and a collection of referenced invoice identifiers. This means Merchant has an independent lifecycle — it exists before and after any specific invoice.

Value objects live under `Invoices/DDD/ValueObjects/` and include `PaymentInformation`, `Recipe`, `Allergen`, and product-centric value objects under `ValueObjects/Products/`. These are immutable and compared by value, not identity.

---

Related Insights:
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] — foundation: the inheritance chain Invoice follows
- [[domain-events-are-implicit-through-service-layer-coordination-not-explicit-types]] — extends: how Invoice state changes propagate
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: the Invoices context that owns this aggregate

Domains:
- [[backend-architecture]]
