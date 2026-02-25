---
description: "Convention requires passing a namespace to useTranslations('Footer') or getTranslations('Page') rather than calling an unscoped translator with full dot-paths"
type: convention
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Scoped translators narrow namespace to prevent full path key access

The established convention is to always pass a namespace argument when creating a translator: `useTranslations("Footer")` or `await getTranslations("Domains.__metadata__")`. The resulting translator function `t()` then accepts only keys relative to that namespace. The RFC explicitly marks the alternative -- calling `useTranslations()` without a namespace and using full dot-paths like `t("Footer.copyright")` -- as an anti-pattern.

Scoping provides three benefits. First, it limits the IntelliSense autocomplete surface to keys relevant to the current component, reducing cognitive noise. A Footer component scoped to `"Footer"` sees only `copyright`, `description`, and `links.*` -- not the hundreds of keys from other namespaces. Second, it makes components self-documenting: the namespace argument declares which section of the translation file this component owns. Third, it supports deep scoping for deeply nested components: `useTranslations("Domains.services.invoices.service.main-page")` narrows to just the keys under that path.

This convention pairs naturally with the hierarchical namespace structure. Each component scopes to its own branch of the translation tree, and the type system validates that the scoped keys actually exist at that path. Refactoring a namespace path requires updating both the JSON structure and the component's scope argument, but the type system catches mismatches immediately.

---

Related Insights:
- [[translation-namespaces-mirror-component-hierarchy-using-mixed-case-conventions]] -- foundation: scoping consumes the hierarchical namespace structure
- [[auto-generated-types-enforce-translation-key-safety-at-compile-time]] -- enables: type generation makes scoped key access compile-time safe

Domains:
- [[frontend-patterns]]
