---
description: "CreateInvoiceDto and similar DTOs in the DTOs/ folder carry a ToInvoice() mapping method, keeping HTTP payload shapes independent from domain model structure"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# DTOs decouple HTTP request shapes from domain aggregate structure

The Invoices bounded context uses Data Transfer Objects (located in `Invoices/DTOs/`) to create a translation layer between HTTP request payloads and domain aggregates. When an endpoint receives a `CreateInvoiceDto`, it calls `invoiceDto.ToInvoice()` to convert the API-facing shape into the domain's `Invoice` aggregate before passing it to the Processing service. This conversion happens exclusively at the endpoint layer -- service layers below never handle DTOs.

This decoupling serves several purposes. First, the API contract can evolve independently of the domain model: adding a field to the HTTP request does not require changing `Invoice`, and restructuring the aggregate does not break the API contract (only the DTO mapping needs updating). Second, DTOs can omit domain-internal fields that callers should not set (like computed timestamps or system-generated references), effectively acting as an input whitelist. Third, validation can happen at two levels: the DTO enforces API-level constraints (required fields, format rules) while the domain entity enforces business invariants.

The `ToInvoice()` method living on the DTO (rather than a separate mapper class) keeps the mapping co-located with the shape definition. Since [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]], the DTO-to-domain conversion is the last HTTP-aware operation before the request enters the transport-agnostic service layers.

---

Related Insights:
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — foundation: endpoints are the only layer that handles DTOs
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — extends: the domain aggregate that DTOs map into
- [[ddd-folder-structure-mirrors-tactical-patterns-within-each-bounded-context]] — convention: DTOs/ sits alongside DDD/, Services/, and Endpoints/ in the bounded context

Domains:
- [[backend-architecture]]
