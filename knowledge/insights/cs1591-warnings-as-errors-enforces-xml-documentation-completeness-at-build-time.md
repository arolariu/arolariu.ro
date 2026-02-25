---
description: "Directory.Build.props sets TreatWarningsAsErrors with CS1591, so any public member missing XML docs fails the build — the backend parallel to eslint-plugin-jsdoc"
type: constraint
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# CS1591 warnings-as-errors enforces XML documentation completeness at build time

The backend enforces XML documentation coverage through the C# compiler itself, not through a separate linting step. `Directory.Build.props` enables both `GenerateDocumentationFile` and `TreatWarningsAsErrors` with `CS1591` (missing XML comment for publicly visible type or member) configured as an error. This means every public or protected member without an XML doc comment causes a build failure, making it impossible to ship undocumented public APIs.

This is the backend equivalent of how [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] works on the frontend. The enforcement mechanism differs — compiler warning vs. ESLint rule — but the effect is identical: documentation completeness is a machine-enforced invariant, not a code-review suggestion. Private members and auto-generated code are excluded from the requirement, keeping the constraint practical rather than burdensome.

The strictness has a cascading benefit: because Swagger/OpenAPI and DocFX both consume XML documentation files, enforcing CS1591 at build time guarantees that generated API documentation is always complete. No endpoint ships without a description.

---

Related Insights:
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — frontend parallel: same enforcement philosophy, different toolchain
- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] — enables: build-time enforcement guarantees all three consumers get complete input

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
