---
description: "BEM's block__element--modifier naming is unnecessary because CSS Modules provide automatic scope isolation; camelCase matches JavaScript property access and React community conventions"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# CSS Module classes use semantic camelCase not BEM

All class names in `.module.scss` files follow semantic camelCase naming: `.heroSection`, `.cardTitle`, `.ctaButtonIcon`. BEM's double-underscore and double-dash syntax (`.card__title`, `.card--primary`) is explicitly rejected. The rationale is that BEM exists to prevent class name collisions through manual namespacing, but CSS Modules already solve this through automatic hash-based scoping at compile time. Using BEM on top of CSS Modules would add verbosity without benefit.

The camelCase convention aligns class names with JavaScript object property access patterns, making the JSX integration cleaner: `styles["cardTitle"]` reads more naturally than `styles["card__title"]`. Hierarchical grouping uses common prefixes instead of BEM nesting -- a card's children are `.cardHeader`, `.cardContent`, `.cardFooter`, not `.card__header`, `.card__content`, `.card__footer`. This produces a flat namespace within each module that is easy to scan and search.

Kebab-case (`.hero-section`) is also rejected because it requires bracket notation in JavaScript anyway and doesn't carry the semantic grouping benefit of shared prefixes.

---

Related Insights:
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] -- foundation: camelCase naming works because CSS Modules provide the scoping that BEM would otherwise handle
- [[bracket-notation-required-for-css-module-class-access-in-typescript]] -- extends: camelCase names are accessed via bracket notation in JSX

Domains:
- [[frontend-patterns]]
