---
description: "Every component has three natures: Dependencies (what it consumes), Purpose (its core computation), and Exposure (how it publishes results) -- mapping to Brokers, Services, and Exposers"
type: decision
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Tri-Nature theory grounds The Standard in dependencies, purpose, and exposure

The Standard's five-layer architecture is not arbitrary layering -- it derives from the Tri-Nature theory, which states that every software component has three fundamental aspects: Dependencies (what external systems it relies on), Purpose (what computation or transformation it performs), and Exposure (how it makes its results available to consumers). The five layers map to this theory: Brokers represent Dependencies, Foundation through Orchestration represent Purpose (at increasing levels of abstraction), and Exposers represent Exposure.

This theoretical grounding explains why the layers exist and why they cannot be arbitrarily reorganized. Brokers must be at the bottom because dependencies are inputs. Exposers must be at the top because exposure is output. The middle layers (Foundation, Processing, Orchestration) stratify the Purpose nature by complexity: simple validated CRUD, higher-order computation, and multi-entity coordination respectively.

For the arolariu.ro backend, this means that when adding new functionality, the question is not "which layer should this go in?" but rather "is this a dependency concern, a purpose concern, or an exposure concern?" A new external API integration is a Broker (Dependency). A new business calculation is a Processing service (Purpose). A new REST endpoint is an Exposer (Exposure). The Tri-Nature theory provides the classification heuristic that keeps layer assignment consistent.

---

Related Insights:
- [[service-layers-flow-strictly-downward-in-the-standard]] -- extends: the downward flow follows the Dependencies-to-Exposure direction
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- example: Brokers embody the Dependencies nature with no Purpose
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] -- example: Exposers embody the Exposure nature with no business logic

Domains:
- [[backend-architecture]]
