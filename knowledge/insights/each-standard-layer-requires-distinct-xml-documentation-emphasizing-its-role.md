---
description: "Brokers document dependency abstraction only, Foundation services document CRUD+validation, Orchestration documents coordination, Processing documents computation, Exposers document HTTP mapping"
type: pattern
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Each Standard layer requires distinct XML documentation emphasizing its role

XML documentation in this codebase is not uniform — it varies systematically by which layer of The Standard the code belongs to. Each layer's documentation emphasizes different concerns, making the documentation itself a teaching tool for the architectural hierarchy.

**Brokers** document only the external dependency they abstract (e.g., "thin abstraction over Cosmos DB") and explicitly state what they must NOT do: no domain validation, no cross-aggregate orchestration, no authorization, no business logic. This negative documentation is as important as the positive, since [[broker-documentation-must-not-describe-business-logic-only-dependency-abstraction]].

**Foundation services** document CRUD responsibilities, domain invariant enforcement, and strongly typed exception propagation. Their remarks must include a "Layer Role (The Standard)" section stating they interact with persistence through brokers and must NOT coordinate multi-aggregate workflows or call other foundation services sideways.

**Orchestration services** document coordination patterns — which foundation services they compose and what cross-cutting concerns they manage. **Processing services** document heavy computation and AI/ML integration. **Exposers (Endpoints)** document HTTP mapping, request/response contracts, and which single processing service they delegate to.

This layer-aware documentation turns XML comments into architectural guardrails: a developer reading the docs immediately understands what a class should and should not be doing based on its layer.

---

Related Insights:
- [[broker-documentation-must-not-describe-business-logic-only-dependency-abstraction]] — example: the broker-specific documentation constraint
- [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]] — extends: how architectural alignment is expressed in remarks
- [[interface-docs-require-layer-role-responsibilities-list-and-implementation-references]] — example: the interface template that implements this pattern

Domains:
- [[backend-architecture]]
