---
description: "Language changes propagate: Commander -> preferencesStore.setLocale() -> setCookie server action -> onLocaleSync callback -> router.refresh(), avoiding full page reloads"
type: pattern
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Locale switching flows through Zustand store to cookie to router refresh

Changing the active locale is a five-step chain that bridges client-side state, server actions, and the Next.js router without triggering a full page reload. The Commander component calls `usePreferencesStore.getState().setLocale("ro")`, which updates the Zustand store. A store subscription detects the locale change and invokes the `setCookie("locale", locale)` server action to persist the new value as an HTTP cookie. After the cookie is written, an `onLocaleSync` callback fires, which triggers `router.refresh()` from the providers component. The refresh causes `getLocale()` in the root layout to re-read the updated cookie server-side, and the application re-renders with the new locale's translations.

This architecture separates concerns cleanly: the UI layer (Commander) only knows about the Zustand store, the persistence layer (server action) only knows about cookies, and the rendering layer (root layout) only knows about `getLocale()`. The `onLocaleSync` callback registered in `providers.tsx` via `useEffect(() => onLocaleSync(() => router.refresh()), [router])` is the glue that connects cookie persistence to re-rendering.

The design avoids both a full navigation (which would lose client state) and a client-only locale swap (which would desync from the server's locale resolution). The `router.refresh()` call re-runs Server Components with the updated cookie while preserving client-side React state.

---

Related Insights:
- [[cookie-based-locale-routing-avoids-url-path-segments]] -- foundation: the cookie is the persistence mechanism this chain writes to
- [[dual-translation-api-maps-to-the-island-pattern]] -- enables: after refresh, both server and client APIs read the new locale

Domains:
- [[frontend-patterns]]
