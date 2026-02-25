---
description: "BEM double-underscore and double-dash naming rejected; CSS Modules hash class names automatically, so semantic camelCase like cardTitle and ctaButton suffices"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# CSS Module classes use semantic camelCase not BEM because scoping is automatic

Class names in `.module.scss` files follow semantic camelCase naming -- `cardTitle`, `ctaButton`, `heroSection` -- rather than BEM conventions like `card__title` or `card--primary`. The rationale is straightforward: CSS Modules already prevent class name collisions by hashing each class to a unique identifier at build time, so BEM's namespacing purpose is redundant. camelCase also matches JavaScript object property access patterns, making `styles["cardTitle"]` in JSX cleaner than `styles["card__title"]`.

Related elements group under common prefixes to preserve visual hierarchy without BEM's delimiter syntax. A card component uses `card`, `cardHeader`, `cardHeaderTop`, `cardIcon`, `cardTitle`, `cardDescription`, `cardContent`, and `cardFooter`. A CTA section uses `ctaWrapper`, `ctaGlow`, and `ctaButton`. The prefix communicates belonging; the suffix communicates role. This creates a flat class namespace per module file that is scannable without the visual noise of double underscores.

Kebab-case (`hero-section`) is also prohibited because it requires bracket notation with string literals in JSX and does not align with the JavaScript property convention that the rest of the React codebase follows.

---

Related Insights:
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] -- foundation: CSS Modules' automatic scoping eliminates the need for BEM namespacing
- [[bracket-notation-accesses-scss-module-classes-for-typescript-safety]] -- extends: the camelCase convention aligns with the bracket access pattern

Domains:
- [[frontend-patterns]]
