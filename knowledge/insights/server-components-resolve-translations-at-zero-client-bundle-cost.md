---
description: "getTranslations() in RSC pages renders translated strings into HTML on the server; no next-intl runtime or message JSON is shipped to the browser"
type: pattern
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Server Components resolve translations at zero client bundle cost

When a React Server Component calls `const t = await getTranslations("Namespace")` and renders `{t("title")}`, the translation is resolved entirely during server rendering. The HTML sent to the browser contains the final translated string -- the client never receives the translation key, the message JSON, or the next-intl lookup runtime. This means RSC-heavy pages incur zero i18n bundle cost regardless of how many translations they use.

This property is a direct consequence of the RSC architecture: Server Components execute on the server and stream rendered HTML. Since `getTranslations()` is an async function that completes before the component's output is serialized, the translation is already a concrete string by the time it reaches the wire. The client receives `<h1>About Us</h1>`, not `<h1>{t("About.__metadata__.title")}</h1>`.

Client Components using `useTranslations()` do pay a bundle cost: the next-intl runtime (~5-8 KB gzipped) plus the full message JSON for the active locale (~3 KB gzipped per locale). This asymmetry reinforces the Island pattern's guidance to keep interactivity in island components and keep data display in server components. The more translations that live in `page.tsx` rather than `island.tsx`, the less i18n overhead reaches the client.

---

Related Insights:
- [[dual-translation-api-maps-to-the-island-pattern]] -- foundation: this zero-cost property is why the dual API exists
- [[dynamic-imports-load-only-the-active-locale-messages-per-request]] -- enables: dynamic imports ensure only one locale's JSON is loaded server-side per request

Domains:
- [[frontend-patterns]]
