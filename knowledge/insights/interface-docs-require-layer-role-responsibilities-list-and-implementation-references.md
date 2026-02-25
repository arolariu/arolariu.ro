---
description: "Interface XML docs follow a three-part template: bold Layer Role section stating The Standard position, bullet-list of contract responsibilities, and <see cref> links to concrete implementations"
type: pattern
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Interface docs require layer role responsibilities list and implementation references

Interface documentation in the backend follows a strict three-part template within `<remarks>`. First, a bold "Layer Role (The Standard)" section declares which architectural layer the interface contract belongs to and what that layer may and may not do. Second, a `<list type="bullet">` enumerates the specific responsibilities the interface contract imposes on implementations. Third, `<see cref="">` and `<seealso cref="">` tags link to concrete implementations so that developers can navigate from contract to implementation without searching.

The `IInvoiceStorageFoundationService` demonstrates this pattern concretely: its remarks state it is a Foundation service that encapsulates persistence through brokers plus domain validations, its responsibility list covers CRUD, domain invariant enforcement, and strongly typed exception propagation, and its `seealso` tags point to `InvoiceNoSqlBroker` and the concrete service class.

This template matters because since [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]], the codebase has many narrowly-scoped interfaces. Without the structured documentation template, developers would face a proliferation of interfaces with unclear relationships. The template makes each interface self-documenting about where it sits in the architecture and what it expects from implementors.

---

Related Insights:
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] -- foundation: the interface proliferation that makes structured documentation essential
- [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]] -- extends: the broader remarks convention that this template instantiates for interfaces specifically
- [[each-standard-layer-requires-distinct-xml-documentation-emphasizing-its-role]] -- enables: interfaces carry their layer identity through this documentation pattern

Domains:
- [[backend-architecture]]
