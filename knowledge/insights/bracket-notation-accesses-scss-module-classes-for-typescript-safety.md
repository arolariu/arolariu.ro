---
description: "styles['className'] preferred over styles.className because the CSS Modules type declaration makes all properties optional strings, and bracket notation makes this explicit"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Bracket notation accesses SCSS Module classes for TypeScript safety

React components consuming CSS Module styles must use bracket notation -- `styles["section"]`, `styles["cardTitle"]` -- rather than dot notation like `styles.section`. The CSS Modules type declaration treats all class name properties as `string | undefined`, and bracket notation makes this optionality explicit in the code. Dot notation compiles but hides the fact that a typo in the class name silently produces `undefined` rather than a compile error.

This convention also applies when composing conditional classes. Variant mapping uses bracket notation with a lookup object: a `variantMap` const maps prop values to class names, and the component accesses `styles[variantMap[variant]]`. For boolean conditionals, template literals combine base and conditional classes: `` `${styles["container"]} ${isActive ? styles["active"] : ""}` ``. This is more verbose than Tailwind's `cn()` utility but maintains the scoping guarantee that CSS Modules provide.

The trade-off is ergonomic: there is no TypeScript autocomplete for CSS Module class names (unlike typed CSS-in-JS solutions), so a misspelled class name only fails silently at runtime. The convention of bracket notation at least makes access patterns grep-searchable and visually consistent across the codebase.

---

Related Insights:
- [[css-module-classes-use-semantic-camelcase-not-bem-because-scoping-is-automatic]] -- foundation: camelCase naming aligns with bracket access as JavaScript property lookup
- [[every-css-module-file-starts-with-use-abstracts-as-star-import]] -- context: the SCSS Module files whose classes are accessed via bracket notation

Domains:
- [[frontend-patterns]]
