---
description: "Processing services combine 2-3 Foundation services for enrichment, batch operations, and computational logic while staying transport-agnostic with no HTTP concerns"
type: pattern
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Processing services perform higher-order logic without direct broker access

Processing services occupy the middle tier of The Standard's five-layer architecture. They combine multiple Foundation services to perform computational work that goes beyond simple CRUD: multi-step enrichment (like invoice analysis with AI normalization), batch operations (deleting all invoices for a user), collection-level manipulations (adding products to an invoice), and data transformations. The critical constraint is that Processing services never call Brokers directly -- all persistence flows through Foundation services.

In the arolariu.ro backend, `InvoiceProcessingService` depends on `IInvoiceStorageFoundationService` and `IInvoiceAnalysisFoundationService` (two Foundation dependencies, respecting the Florance Pattern). Its `AnalyzeInvoice` method orchestrates a multi-step enrichment pipeline: retrieving an invoice, running product normalization, applying categorization, and persisting the enriched result -- all by composing Foundation service calls.

Processing services validate only "used data" -- they check only the specific fields they actually consume rather than re-validating the entire aggregate that Foundation already validated. They remain completely transport-agnostic: no HTTP status codes, no request/response mapping, no protocol awareness. This makes them reusable across different exposure mechanisms (REST, gRPC, message handlers).

---

Related Insights:
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- foundation: the layer Processing services compose
- [[the-florance-pattern-limits-each-service-to-two-or-three-dependencies]] -- constraint: Processing services consume 2-3 Foundation services maximum
- [[orchestration-services-coordinate-multi-entity-workflows-across-processing-services]] -- extends: the layer above that composes Processing services
- [[each-layer-validates-its-own-inputs-independently]] -- convention: Processing validates only used-data, not full aggregates

Domains:
- [[backend-architecture]]
