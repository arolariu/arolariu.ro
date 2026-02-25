---
description: "Exposers may only call Processing, Processing only Orchestration, Orchestration only Foundation, Foundation only Brokers -- no sideways or upward calls permitted"
type: constraint
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Service layers flow strictly downward in The Standard

The Standard enforces a rigid unidirectional call chain across its five service layers: Exposers call Processing, Processing calls Orchestration, Orchestration calls Foundation, and Foundation calls Brokers. This is not merely a guideline -- it is the central architectural invariant. A Foundation service may never call another Foundation service (that would be a sideways call requiring Orchestration). An Orchestration service may never call a Processing service (that would be an upward call inverting the hierarchy). A Broker may never call any service at all.

This constraint eliminates circular dependencies, makes the call graph predictable, and ensures that each layer has a single well-defined role. When you need cross-entity coordination, you move up to the Orchestration layer rather than introducing lateral coupling at the Foundation level. The call direction also determines the exception wrapping direction: each layer catches exceptions from the layer immediately below and reclassifies them with its own exception type, creating a clean exception propagation chain from Broker failures up through to HTTP responses.

The practical consequence is that if you find yourself needing Foundation-to-Foundation communication, the design requires introducing or using an Orchestration service to mediate. This feels heavy at first, but it prevents the tangled dependency graphs that emerge when horizontal calls are permitted.

---

Related Insights:
- [[the-florance-pattern-limits-each-service-to-two-or-three-dependencies]] -- the dependency count rule that complements this directional constraint
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- the bottom layer that anchors the downward chain
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- enables: the exception wrapping that follows this call direction
- [[backend-is-a-modular-monolith-not-microservices]] -- foundation: the deployment model these layers exist within

Domains:
- [[backend-architecture]]
