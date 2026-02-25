---
description: "A single XML doc comment serves three consumers at once: IDE hover tooltips, DocFX static site generation, and Swagger/OpenAPI operation descriptions -- no separate documentation source needed"
type: dependency
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML documentation feeds IntelliSense DocFX and Swagger simultaneously

The backend's XML documentation is not written for one consumer -- it feeds three distinct documentation pipelines from a single source. Visual Studio and VS Code surface `<summary>` in hover tooltips and `<param>`/`<returns>` in signature help. DocFX parses the same XML from compiled assemblies to generate a static HTML documentation site (at `sites/docs.arolariu.ro/`). Swashbuckle reads `<summary>` as Swagger operation descriptions and `<param>` as parameter descriptions for the OpenAPI spec.

This triple-consumer architecture is why the documentation standard imposes such specific formatting rules. The 80-character summary cap exists partly because Swagger API explorer pages truncate long descriptions. The structured `<remarks>` with `<para>` sections exist because DocFX renders them as formatted HTML. The `<see cref="">` cross-references resolve automatically in DocFX but are stripped in Swagger. Each design choice in the documentation standard balances the needs of all three consumers.

The practical implication is that since [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]], all three pipelines are guaranteed complete input. No endpoint ships without a Swagger description, no public type lacks a DocFX page, and no symbol hovers without an IntelliSense tooltip.

---

Related Insights:
- [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- foundation: the enforcement mechanism that guarantees all three consumers receive complete documentation
- [[xml-summary-tags-are-capped-at-80-characters-matching-the-jsdoc-convention]] -- enables: the summary constraint balances needs across IntelliSense, DocFX, and Swagger display widths
- [[typedoc-generates-api-reference-from-jsdoc-into-the-docs-site]] -- frontend parallel: TypeDoc serves the same role for frontend that DocFX serves for backend

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
