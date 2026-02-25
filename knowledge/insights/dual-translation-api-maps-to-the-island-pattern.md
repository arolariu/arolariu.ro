---
description: "Server Components use async getTranslations() while Client Components use the useTranslations() hook, mirroring the RSC page / client island split"
type: pattern
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Dual translation API maps to the Island pattern

next-intl provides two translation APIs that align directly with the application's Island architecture: `getTranslations()` is an async server-side function for React Server Components (the `page.tsx` layer), and `useTranslations()` is a React hook for Client Components (the `island.tsx` layer). This is not an arbitrary API split -- it mirrors how Next.js partitions rendering.

In the page layer, `getTranslations("Namespace")` runs during server rendering and can be called without any provider context. The translated strings are baked into the HTML before it reaches the client. In the island layer, `useTranslations("Namespace")` reads from the `NextIntlClientProvider` context that wraps the component tree. This means the provider must be an ancestor of any client component using translations.

The practical consequence: when building a new page following the Island pattern, translation calls in `page.tsx` use the async API and produce zero client-side overhead, while interactive elements in `island.tsx` use the hook API and require the next-intl runtime in the client bundle. Both APIs accept the same namespace scoping, so the mental model is consistent regardless of render context.

---

Related Insights:
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] -- extends: the translation API choice follows the same server/client partition as telemetry context
- [[server-components-resolve-translations-at-zero-client-bundle-cost]] -- foundation: the server-side API is why RSC translations are free
- [[cookie-based-locale-routing-avoids-url-path-segments]] -- enables: locale resolution feeds both translation APIs from the same cookie source

Domains:
- [[frontend-patterns]]
