---
description: "Domain and application layers target 85%+ coverage via xUnit/MSTest; infrastructure layer coverage is optional, focusing on integration tests instead"
type: constraint
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Domain and application layers require 85 percent test coverage

The backend testing strategy sets a clear boundary: the domain layer (entities, value objects, aggregates) and the application layer (Foundation, Orchestration, Processing services) each require 85%+ code coverage. The infrastructure layer — Brokers, database contexts, external service integrations — is explicitly exempted from coverage targets. Infrastructure testing focuses on integration tests that verify actual external interactions rather than unit tests with heavy mocking.

This two-tier approach reflects a DDD principle: the domain and application layers contain the business logic worth protecting with extensive tests, while the infrastructure layer is thin enough (Brokers are wrappers with no business logic) that over-testing it provides diminishing returns. Coverage is measured using `dotnet test --collect:"XPlat Code Coverage"` and enforced as part of the CI pipeline. Dropping below the threshold should block merges.

---

Related Insights:
- [[backend-test-naming-follows-method-condition-expected-pattern]] — convention: how the tests meeting this coverage target are structured
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — foundation: the layer boundaries that define what needs coverage

Domains:
- [[backend-architecture]]
