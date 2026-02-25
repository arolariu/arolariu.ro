---
description: "Every class-level <remarks> block must include a bold 'Layer Role (The Standard)' section and reference DDD concepts (aggregate root, bounded context, value object) where applicable"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML remarks must reference DDD patterns and The Standard layer roles

The documentation standard requires that `<remarks>` blocks on service classes, interfaces, and domain entities explicitly reference the architectural patterns they implement. Service layer classes must include a bold-labeled "Layer Role (The Standard)" paragraph stating which layer they occupy and what that layer's responsibilities are. Domain classes must reference their DDD tactical pattern -- aggregate root, entity, value object, or domain event.

This is not mere documentation ceremony. The architectural cross-references serve as embedded teaching material: a new developer reading the IntelliSense for `InvoiceStorageFoundationService` immediately learns that it is a Foundation service, that Foundation services encapsulate persistence through brokers plus domain validation, and that they must NOT coordinate multi-aggregate workflows. This context would otherwise require reading RFC 2003 separately.

The pattern creates a bidirectional link between documentation and architecture. Code that claims to be a Foundation service but has remarks describing orchestration-level coordination reveals a design violation through its own documentation. Since [[service-layers-flow-strictly-downward-in-the-standard]], the documentation acts as a second enforcement channel alongside the dependency graph -- the remarks should describe only downward interactions. Similarly, aggregate roots reference RFC 2001's DDD patterns, and telemetry-integrated services reference RFC 1001/2002's observability conventions.

---

Related Insights:
- [[each-standard-layer-requires-distinct-xml-documentation-emphasizing-its-role]] -- foundation: the broader pattern of layer-differentiated documentation this convention implements
- [[service-layers-flow-strictly-downward-in-the-standard]] -- enables: the layer roles documented in remarks mirror the strict call direction
- [[ddd-folder-structure-mirrors-tactical-patterns-within-each-bounded-context]] -- extends: folder structure and documentation both reinforce DDD pattern identification

Domains:
- [[backend-architecture]]
