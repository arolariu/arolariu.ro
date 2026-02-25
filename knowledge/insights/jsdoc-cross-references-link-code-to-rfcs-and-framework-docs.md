---
description: "@see and inline @link tags create a reference web from source code to RFCs, Next.js docs, React docs, and OpenTelemetry specs — preserving architectural provenance"
type: pattern
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# JSDoc cross-references link code to RFCs and framework docs

This codebase treats JSDoc `@see` and `{@link}` tags as a knowledge graph within the source code itself. Every type, function, or component that implements a framework convention or architectural decision includes cross-references to the authoritative source: Next.js documentation URLs for rendering patterns, OpenTelemetry specification links for semantic conventions, and internal RFC references for project-specific design decisions.

The pattern serves two distinct purposes. First, it preserves **architectural provenance** — when a developer encounters a rendering context type or a span naming convention, the `@see` link answers "where did this come from?" without requiring them to search through Slack, wikis, or RFCs. Second, it enables **inline type navigation** through `{@link}` tags that reference related TypeScript types within prose descriptions, allowing IDE users to Ctrl+click from documentation directly to the referenced type definition.

The convention is especially valuable at the boundary between framework conventions and project-specific patterns. For example, the `HttpAttributes` interface links to the OpenTelemetry HTTP semantic conventions spec, making it clear that the attribute names are not arbitrary choices but spec-compliant identifiers. This prevents well-intentioned refactoring from breaking interoperability.

---

Related Insights:
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — example: telemetry interfaces use @see to link back to the OTEL spec
- [[fileoverview-tags-provide-module-level-architectural-context]] — extends: module-level docs are a natural aggregation point for cross-references
- [[typedoc-generates-api-reference-from-jsdoc-into-the-docs-site]] — enables: TypeDoc resolves @link tags into clickable hyperlinks in generated docs

Domains:
- [[frontend-patterns]]
