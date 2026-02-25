---
description: "New authorization policies, service implementations, and business rule strategies can be added without modifying existing code — extension through interfaces, not modification"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Open-closed principle enables extension through policies and additional service implementations

The backend architecture implements the Open/Closed Principle through three concrete extension mechanisms. First, policy-based authorization allows new authorization requirements to be added as new policy definitions without modifying the Core.Auth bounded context's existing code. Second, since [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]], new Processing or Orchestration service implementations can be registered behind existing interfaces to alter behavior without changing consumers. Third, the strategy pattern enables pluggable business rules -- different validation or analysis strategies can be injected through DI without modifying the service classes that consume them.

This is particularly important in a modular monolith because modules evolve at different rates. The Invoices domain might need a new analysis strategy (e.g., a different AI model for invoice processing) while Core.Auth remains stable. OCP ensures that adding the new strategy is an additive change: register a new implementation, wire it in the domain configuration extension method, done. No existing service class needs editing.

The practical test for OCP compliance in this codebase: if adding a new business capability requires modifying existing service implementations (rather than adding new ones), the design has drifted from OCP. The fix is typically to extract an interface for the varying behavior and inject it.

---

Related Insights:
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — enables: focused interfaces are the extension points OCP leverages
- [[primary-constructors-implement-dependency-injection-at-every-service-layer]] — enables: DI is the mechanism that makes new implementations pluggable
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — example: new implementations are wired in the domain's configuration extension

Domains:
- [[backend-architecture]]
