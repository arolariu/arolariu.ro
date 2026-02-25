---
description: "Foundation tests mock Brokers, Processing tests mock Foundation services, Orchestration tests mock Processing, Exposer tests mock the single Processing service -- no transitive mocking"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Each layer mocks only the layer directly below for test isolation

The Standard's testing strategy follows directly from its layered architecture: unit tests for each layer mock only the immediate dependency layer, never transitive dependencies. Foundation service tests create `Mock<IInvoiceNoSqlBroker>` and verify that validation runs before broker calls. Processing service tests mock Foundation interfaces and verify computational logic. Orchestration tests mock Processing services and verify multi-entity coordination. Exposer tests mock the single Processing service and verify HTTP mapping.

This produces genuinely isolated unit tests. A `InvoiceStorageFoundationServiceTests` class sets up `Mock<IInvoiceNoSqlBroker>` and `Mock<ILoggerFactory>`, then verifies behaviors like "Should create invoice when valid invoice provided" and "Should throw validation exception when identifier not set." The Foundation test never knows or cares about Cosmos DB, AI services, or HTTP routing -- it tests only the Foundation layer's responsibilities.

The mocking strategy also enforces architectural correctness through tests. If a developer accidentally introduces a direct Broker dependency in a Processing service (violating [[service-layers-flow-strictly-downward-in-the-standard]]), the Processing tests would need to mock Broker interfaces, which would be a visible code smell. Tests become architectural guardrails: they fail to compile cleanly when layer boundaries are violated, since [[interface-driven-design-enables-mock-based-unit-testing-at-every-layer]].

---

Related Insights:
- [[interface-driven-design-enables-mock-based-unit-testing-at-every-layer]] -- foundation: interfaces provide the mock boundaries this strategy depends on
- [[service-layers-flow-strictly-downward-in-the-standard]] -- enables: unidirectional dependencies create clean mock surfaces per layer
- [[domain-and-application-layers-require-85-percent-test-coverage]] -- constraint: the coverage target these per-layer tests aim to meet
- [[backend-test-naming-follows-method-condition-expected-pattern]] -- convention: the naming pattern used within these per-layer test classes

Domains:
- [[backend-architecture]]
