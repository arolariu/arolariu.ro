---
description: "Swashbuckle's IncludeXmlComments reads the generated XML file at runtime, mapping <summary> to operation descriptions and <param> to parameter descriptions in the OpenAPI spec"
type: dependency
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Swashbuckle maps XML summary to Swagger operation descriptions via IncludeXmlComments

The backend's Swagger/OpenAPI documentation is generated automatically from XML documentation comments through Swashbuckle's `IncludeXmlComments` configuration. At startup, the application loads the compiled XML documentation file (`{Assembly}.xml`) and Swashbuckle maps `<summary>` to operation descriptions, `<param>` to parameter descriptions, `<returns>` to response descriptions, and `<remarks>` to extended operation information. This means the API documentation that external consumers see is literally the same text developers see in IntelliSense.

The configuration is minimal -- a single `c.IncludeXmlComments(xmlPath)` call in `AddSwaggerGen` -- but the architectural implication is significant. It creates a hard dependency between documentation quality and API consumer experience. A vague summary like "Handles invoices" would appear directly in the Swagger UI as the endpoint description, visible to every API consumer. This is why [[xml-documentation-anti-patterns-prevent-signature-repetition-and-vague-summaries]] matters practically, not just aesthetically.

The XML-to-Swagger pipeline also explains why the documentation standard insists on the 80-character summary cap: Swagger UI renders operation descriptions in constrained table cells and sidebar lists. Long summaries wrap awkwardly or get truncated. The structured `<remarks>` with labeled sections become the "expanded" documentation accessible through Swagger's "try it out" detail views.

---

Related Insights:
- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] -- foundation: this is the Swagger-specific mechanism within the triple-consumer architecture
- [[xml-documentation-anti-patterns-prevent-signature-repetition-and-vague-summaries]] -- extends: anti-patterns have visible impact in Swagger UI where external consumers see the docs
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] -- enables: only endpoint XML docs appear in Swagger since only endpoints map to HTTP operations

Domains:
- [[backend-architecture]]
