---
description: "InvoiceOrchestrationService depends on 2 Foundation services to coordinate cross-aggregate flows like create-invoice-then-analyze-then-link-merchant"
type: pattern
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Orchestration services coordinate multi-entity workflows across processing services

Orchestration sits between Processing and Foundation in The Standard's hierarchy, serving as the layer that coordinates work spanning multiple entities or aggregates. While Foundation services are single-entity focused (one service per broker) and Processing services handle computational logic, Orchestration services manage multi-entity workflows: creating an invoice and linking it to a merchant, analyzing an invoice and persisting enrichment results back, or coordinating batch operations that touch both invoice and merchant data.

In the arolariu.ro backend, `InvoiceOrchestrationService` depends on `IInvoiceStorageFoundationService` and `IInvoiceAnalysisFoundationService` (2 dependencies, respecting the Florance Pattern). `MerchantOrchestrationService` handles merchant-specific multi-step flows. These services validate cross-entity relationships -- for instance, ensuring that an invoice references a valid merchant -- which is validation that no single Foundation service can perform because Foundation services are deliberately prevented from calling each other sideways.

The Orchestration layer is where the "no sideways calls" constraint from [[service-layers-flow-strictly-downward-in-the-standard]] has its most practical impact. When a developer needs Foundation-to-Foundation communication, they must route through Orchestration. This feels like overhead for simple cases, but it keeps Foundation services independently testable and prevents the lateral coupling that creates hidden dependency graphs.

---

Related Insights:
- [[the-florance-pattern-limits-each-service-to-two-or-three-dependencies]] -- constraint: Orchestration services are limited to 2-3 Foundation/Processing dependencies
- [[processing-services-perform-higher-order-logic-without-direct-broker-access]] -- extends: Processing composes Orchestration services for its computational work
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- foundation: the layer that Orchestration services compose and coordinate
- [[each-layer-validates-its-own-inputs-independently]] -- convention: Orchestration validates cross-entity relationships specifically

Domains:
- [[backend-architecture]]
