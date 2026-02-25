---
description: "XML comments are a first-class development artifact -- they evolve with code, serve as onboarding material, and explain the 'why' not just the 'what', targeting developers, API consumers, and tooling"
type: decision
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML documentation is treated as first-class code not an afterthought

The RFC establishes a foundational design decision: XML documentation comments are not a post-hoc compliance exercise but a primary development artifact on par with the code itself. The standard explicitly rejects the common industry practice of minimal "fill in the template" documentation in favor of "tutorial-level, production-ready documentation embedded directly in source code." This means documentation is written during development, not after, and documentation updates are expected whenever code changes.

This decision has several cascading effects on development workflow. Documentation becomes part of the definition of done for any code change -- since [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]], the build literally fails without it. Documentation quality becomes a code review concern, not just a style preference. And the documentation serves multiple audiences simultaneously: future-you (6 months later), new team members (onboarding), API consumers (external developers), and tooling (DocFX, Swagger).

The "explain the why, not just the what" principle means documentation captures design rationale, trade-offs, and future considerations that would otherwise be lost to git blame archaeology. When a developer documents that collections are mutable "to allow progressive enrichment from OCR and AI services" and that "immutability was considered but rejected due to the multi-stage enrichment workflow," they preserve decision context that no amount of code reading can recover.

---

Related Insights:
- [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- enables: the build-time enforcement that makes this philosophy practical rather than aspirational
- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] -- extends: the multi-consumer architecture that justifies the investment in thorough documentation
- [[jsdoc-serves-as-training-data-for-ai-code-generation]] -- frontend parallel: the same first-class treatment philosophy applied to JSDoc in TypeScript

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
