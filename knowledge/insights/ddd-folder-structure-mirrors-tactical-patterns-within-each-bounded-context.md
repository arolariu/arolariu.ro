---
description: "Each business domain has DDD/AggregatorRoots/, DDD/Entities/, DDD/ValueObjects/ directories alongside Services/Foundation|Orchestration|Processing and Brokers/"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# DDD folder structure mirrors tactical patterns within each bounded context

The Invoices bounded context organizes its source code into directories that directly map to DDD tactical patterns. `DDD/AggregatorRoots/` contains aggregate root classes (e.g., `Invoice`), `DDD/Entities/` contains referenced entities (e.g., `Merchant`), and `DDD/ValueObjects/` contains immutable value objects (e.g., `PaymentInformation`, `Recipe`, `Allergen`). Alongside the DDD folder, `Services/` is subdivided into `Foundation/`, `Orchestration/`, and `Processing/` matching The Standard's service layers, `Brokers/` contains data access wrappers, `Endpoints/` holds Minimal API handlers, `DTOs/` contains data transfer objects, and `Modules/` holds configuration extensions.

This mirroring means a developer can locate any class by knowing two things: which DDD concept it represents and which bounded context it belongs to. New domains should replicate this structure. The directory naming uses plural forms (`AggregatorRoots`, `Entities`, `ValueObjects`) and each sub-directory groups related items by entity name (e.g., `AggregatorRoots/Invoices/`, `Entities/Merchants/`).

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — example: the Invoice aggregate that lives in this structure
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: the bounded contexts that each contain this structure
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — extends: the Services/ subdirectories implement these interfaces

Domains:
- [[backend-architecture]]
