---
description: "A reserved __metadata__ key within each page namespace holds title, description, and keywords for SEO, keeping page metadata distinct from UI strings"
type: convention
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Metadata namespace convention separates SEO from content translations

Every page-level namespace in the translation files reserves a `__metadata__` sub-object for SEO-related strings: `title`, `description`, and optionally `keywords`. This convention creates a clean boundary between strings that appear in HTML meta tags (consumed by `generateMetadata()`) and strings that render as visible UI content.

The double-underscore prefix signals that `__metadata__` is infrastructure, not content. In `generateMetadata()`, the pattern is `const t = await getTranslations("PageName.__metadata__")` followed by `t("title")` and `t("description")`. This means SEO metadata is localized through the same pipeline as UI strings -- no separate CMS or hardcoded fallbacks needed.

The alternative the RFC explicitly warns against is mixing SEO data with content keys at the same nesting level, which creates ambiguity about which `title` or `description` is for meta tags versus for visible page headings. The `__metadata__` convention eliminates this confusion and makes it possible to audit SEO coverage by scanning for the presence of `__metadata__` objects across all page namespaces.

---

Related Insights:
- [[translation-namespaces-mirror-component-hierarchy-using-mixed-case-conventions]] -- extends: __metadata__ is a specialized namespace pattern within the broader hierarchy
- [[auto-generated-types-enforce-translation-key-safety-at-compile-time]] -- enables: type generation includes __metadata__ keys, so generateMetadata() gets compile-time safety
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] -- extends: RFC 1004 perspective on the same convention, focusing on the SEO consumption pattern

Domains:
- [[frontend-patterns]]
