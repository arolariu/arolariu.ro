---
description: "Base config defines template '%s | arolariu.ro' so routes provide only the page-specific segment, avoiding 'About | arolariu.ro | arolariu.ro' duplication"
type: convention
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Title template pattern prevents double site-name in page titles

The base metadata configuration uses Next.js's `TemplateString` type to define three title modes: `template` (`"%s | arolariu.ro"`), `default` (used when no title is provided), and `absolute` (used for the root page). Routes that use `createMetadata({ title: "About" })` produce the browser tab title "About | arolariu.ro" through the template substitution.

The convention is that route-level metadata must never include the site name in its title string. Providing `title: "About | arolariu.ro"` would produce the doubled result "About | arolariu.ro | arolariu.ro" because the template is applied on top. This is a subtle but common mistake when developers familiar with manual `<title>` tags write Next.js metadata.

The `absolute` title mode exists as an escape hatch for the homepage or any page that needs a fully custom title without template application, but it should be used sparingly. For all standard routes, the template handles branding consistency automatically.

---

Related Insights:
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] -- foundation: the composition function that passes titles through the template
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] -- foundation: the layered design that enables template inheritance

Domains:
- [[frontend-patterns]]
