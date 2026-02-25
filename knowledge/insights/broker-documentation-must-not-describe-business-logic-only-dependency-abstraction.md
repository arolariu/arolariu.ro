---
description: "Broker XML docs explicitly state what brokers do NOT do (no validation, no orchestration, no authorization) -- negative documentation enforces The Standard's layer boundaries"
type: constraint
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Broker documentation must not describe business logic only dependency abstraction

Broker classes document exclusively the external dependency they abstract and the primitive operations they expose. Their `<remarks>` must contain an explicit "Layer Role (The Standard)" paragraph stating that the broker is a thin abstraction over an external dependency and listing what it MUST NOT do: no domain validation, no cross-aggregate orchestration, no authorization, no business workflow branching, no exception classification beyond direct dependency errors.

This negative documentation is architecturally significant because it turns XML comments into a guardrail rather than just a description. A developer reading a broker's docs immediately understands not just what the class does, but what they should NOT add to it. When someone is tempted to add "just a small validation" at the data access layer, the documentation makes the violation visible before code review catches it. Since [[brokers-are-thin-wrappers-with-zero-business-logic]], the documentation standard reinforces the same constraint through a different channel -- the code review catches logic violations, but the documentation standard prevents the intent from forming in the first place.

The broker documentation template requires only: what external dependency is wrapped, what primitive operations are exposed, what configuration the broker owns (connection strings, retry policies, partition keys), and the explicit exclusion list.

---

Related Insights:
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- foundation: the architectural constraint this documentation pattern enforces
- [[each-standard-layer-requires-distinct-xml-documentation-emphasizing-its-role]] -- extends: this is the broker-specific instantiation of the layer-aware documentation pattern
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- enables: by documenting what brokers exclude, it clarifies what Foundation must handle

Domains:
- [[backend-architecture]]
