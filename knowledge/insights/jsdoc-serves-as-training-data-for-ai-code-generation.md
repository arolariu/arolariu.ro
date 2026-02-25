---
description: "Comprehensive JSDoc with @example blocks and constraint documentation directly improves GitHub Copilot suggestion quality and accuracy"
type: decision
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# JSDoc serves as training data for AI code generation

This codebase treats JSDoc comments as an explicit input channel for AI-assisted development tools, particularly GitHub Copilot. The RFC identifies AI code generation as a first-class audience alongside human developers and tooling (TypeDoc, IntelliSense). Realistic `@example` blocks, detailed `@param` constraint descriptions, and `@remarks` explaining design patterns all provide context that improves the quality of AI-generated completions.

The practical implication is that JSDoc writing is not just about human comprehension — it is about giving AI tools enough context to generate correct, pattern-compliant code. When a developer starts typing a new function similar to an existing one, Copilot reads the surrounding JSDoc to understand conventions, parameter formats, error handling patterns, and return value shapes. Without this documentation, AI suggestions default to generic patterns that may violate codebase-specific conventions.

This decision also affects the `@example` convention: examples must be realistic scenarios, not toy demonstrations, because they serve as patterns for AI to replicate. The quality bar for examples is higher when they double as AI training data — they must show real imports, proper error handling, and correct usage of project-specific types.

---

Related Insights:
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — enables: lint enforcement ensures AI tools always have documentation to work with
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — foundation: AI tools need both type shapes and intent documentation

Domains:
- [[frontend-patterns]]
