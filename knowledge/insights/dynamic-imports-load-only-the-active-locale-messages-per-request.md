---
description: "i18n/request.ts uses await import(messages/${locale}.json) so only one locale's ~15KB message file is loaded per server request, not all three"
type: pattern
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Dynamic imports load only the active locale messages per request

The `getRequestConfig()` function in `i18n/request.ts` loads translation messages via a dynamic import: `(await import(\`../../messages/${locale}.json\`)).default`. This ensures that each server request only loads the single message file matching the resolved locale, rather than bundling all locale files together. With three locales at ~15-16 KB raw each, this avoids shipping ~30 KB of unused translations per request.

On the server side, the dynamic import resolves during the request lifecycle and the loaded messages are cached for the duration of that request (via `getLocale()` memoization). Subsequent calls to `getTranslations()` within the same request reuse the already-loaded messages without re-importing.

The client-side provider takes a different approach: `providers.tsx` statically imports all three message files (`enMessages`, `roMessages`, `frMessages`) and selects the correct one via a lookup map. This means the client bundle includes all locale message files. The trade-off is intentional -- the provider needs synchronous access to messages for React hydration, and lazy-loading messages client-side would cause a flash of untranslated content. The RFC identifies namespace-level lazy loading as a future optimization for large translation files.

---

Related Insights:
- [[server-components-resolve-translations-at-zero-client-bundle-cost]] -- extends: dynamic imports are part of how server-side translation achieves zero client cost
- [[cookie-based-locale-routing-avoids-url-path-segments]] -- foundation: the cookie-resolved locale value drives the dynamic import path

Domains:
- [[frontend-patterns]]
