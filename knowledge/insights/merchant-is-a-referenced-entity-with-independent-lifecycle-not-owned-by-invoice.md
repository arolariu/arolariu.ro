---
description: "Merchant has its own Guid identity, category, contact info, parent company linkage, and a collection of referenced invoice IDs — it exists before and after any invoice"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Merchant is a referenced entity with independent lifecycle not owned by Invoice

Within the Invoices bounded context, `Merchant` is classified as a referenced entity rather than an owned entity or value object. Located at `Invoices/DDD/Entities/Merchants/Merchant.cs`, it inherits from `NamedEntity<Guid>` and carries its own identity, category, structured contact information, and parent company linkage. Crucially, Merchant maintains a collection of referenced invoice identifiers, establishing a bidirectional awareness: Invoice holds a `MerchantReference`, and Merchant tracks which invoices reference it.

This design means Merchant has an independent lifecycle -- it can be created before any invoices exist and persists after invoices are deleted. Unlike value objects such as `PaymentInformation` (which are owned by the Invoice aggregate and cannot exist independently), Merchant can be queried, updated, and managed through its own service layer operations. The `Invoice` aggregate does not "own" Merchant in the DDD aggregate ownership sense; it merely references it through `MerchantReference`.

This reference-vs-ownership distinction has practical implications for deletion: deleting an invoice should not cascade to its referenced merchant, and deleting a merchant requires handling the orphaned references in invoices. It also means Merchant-related operations (like updating contact information) do not require loading or locking the Invoice aggregate.

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — foundation: the aggregate that references Merchant without owning it
- [[value-objects-in-the-invoices-domain-are-immutable-types-without-identity]] — contradicts: value objects are owned state, Merchant is a referenced entity with identity
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] — extends: Merchant follows the same BaseEntity to NamedEntity chain as Invoice

Domains:
- [[backend-architecture]]
