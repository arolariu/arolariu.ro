---
description: "styles['className'] is mandatory over styles.className because CSS Module type definitions may not generate typed properties; bracket notation prevents undefined-access bugs"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Bracket notation required for CSS Module class access in TypeScript

When importing CSS Module styles in React components (`import styles from "./Hero.module.scss"`), all class references must use bracket notation: `styles["section"]`, `styles["titleGradient"]`, never dot notation like `styles.section`. This convention exists because CSS Module type definitions do not always generate typed property declarations for every class name. Dot notation may silently return `undefined` if the TypeScript type is a generic index signature, while bracket notation makes the string-key access explicit and consistent.

This convention applies uniformly in JSX className attributes. For conditional classes, the pattern is template literals combining bracket accesses: `` `${styles["container"]} ${isActive ? styles["active"] : ""}` ``. For variant mapping, a typed record maps variant names to class name strings, then bracket-accesses the result: `styles[variantMap[variant]]`.

The trade-off is slightly more verbose JSX compared to dot notation, but the consistency prevents a class of bugs where a typo in dot notation silently renders without the intended style.

---

Related Insights:
- [[css-module-classes-use-semantic-camelcase-not-bem]] -- foundation: the camelCase names accessed via bracket notation
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] -- context: CSS-in-JS solutions like vanilla-extract offer full type safety for class names, which SCSS Modules trade away

Domains:
- [[frontend-patterns]]
