---
description: "Top-level keys are PascalCase domains, nested keys use camelCase, and route-based namespaces use kebab-case, reflecting UI structure in JSON"
type: convention
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Translation namespaces mirror component hierarchy using mixed case conventions

Translation messages in `messages/*.json` follow a hierarchical namespace structure that reflects the UI component tree rather than using flat dot-delimited keys. The casing convention encodes the level of the hierarchy: top-level feature domain keys use PascalCase (`About`, `Domains`, `Footer`), nested property keys use camelCase (`mainPage`, `callToAction`), and route-based namespace segments use kebab-case (`view-invoices`, `create-invoice`).

This three-tier casing convention serves as a visual parsing signal when scanning JSON files or translation key paths in code. A developer encountering `Domains.services.invoices.service.main-page.steps.step1` can immediately tell that `Domains` is a feature domain, `services.invoices.service` is a nested property path, and `main-page` is a route-derived segment. The deep nesting means each component's translations live at a path that mirrors where the component sits in the route tree.

All locale files (`en.json`, `ro.json`, `fr.json`) must maintain structural parity -- every key present in one file must exist in all others. This parallel structure is enforced by type generation and validated by the `scripts/generate.i18n.ts` synchronization script. Adding a new namespace requires updating all locale files simultaneously and regenerating types.

---

Related Insights:
- [[scoped-translators-narrow-namespace-to-prevent-full-path-key-access]] -- extends: scoping is the usage pattern that consumes this namespace structure
- [[english-locale-file-is-the-single-source-of-truth-for-translation-structure]] -- foundation: en.json defines the namespace structure that all locales must mirror

Domains:
- [[frontend-patterns]]
