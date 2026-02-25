---
description: "Locale is persisted via an HTTP cookie named 'locale' rather than /en/ or /ro/ URL prefixes, trading hreflang SEO for simpler routing"
type: decision
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Cookie-based locale routing avoids URL path segments

The i18n system resolves the user's locale from a cookie (`locale`) read via the Next.js `cookies()` API inside `i18n/request.ts`, falling back to English when no cookie is present. This means the application serves all locales at the same URL paths -- `/about` displays in English, Romanian, or French depending on the stored preference, not via `/en/about` or `/ro/about`.

This avoids the complexity of locale-prefixed routing (middleware rewrites, locale-aware `<Link>` components, parallel route trees), but it sacrifices native hreflang URL differentiation. Search engines cannot discover the Romanian version of a page by crawling a distinct URL -- they see one URL whose content varies by cookie. The RFC acknowledges this gap and lists path-based routing as a future enhancement.

The cookie is set site-wide (`path: "/"`) without explicit `httpOnly`, `sameSite`, or `maxAge` flags in the current wrapper, which means client-side JavaScript can read and modify it. The `getRequestConfig()` function validates the cookie value against a hardcoded allowlist (`["en", "ro", "fr"]`) and throws an explicit error for unsupported values, preventing locale injection.

---

Related Insights:
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] -- extends: locale adds another dimension of request context alongside render environment
- [[locale-switching-flows-through-zustand-store-to-cookie-to-router-refresh]] -- extends: the full mechanism that writes and reads this cookie

Domains:
- [[frontend-patterns]]
