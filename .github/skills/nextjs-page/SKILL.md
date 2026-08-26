---
name: nextjs-page
description: Create or internationalize an arolariu.ro App Router page using the RSC-first island pattern. Use for new routes or page-level work requiring metadata, next-intl messages, loading/error states, accessibility, and colocated Vitest coverage.
---

# Next.js Page

## Use When

- Creating an App Router route
- Adding page-level interactivity
- Internationalizing a route
- Adding localized page metadata

## Inputs

- Route
- Page purpose and data ownership
- Interactions
- Loading, error, and empty behavior

## Procedure

1. Read the website local guide, matching instructions, relevant RFCs, a
   neighboring route, its tests, and all locale files.
2. Keep `page.tsx` server-side.
3. Fetch server-owned data in the page or an existing server action.
4. Add an `island.tsx` only for hooks, browser APIs, state, or handlers.
5. Reuse existing UI primitives and route-local component structure.
6. Add `en`, `ro`, and `fr` keys with identical shape.
7. Use shared metadata helpers and localized `__metadata__`.
8. Add loading, error, empty, keyboard, focus, and responsive behavior as the
   route requires.
9. Write colocated failing Vitest coverage before implementation.
10. Run routine website verification.

## Completion

Report the route behavior, server/client ownership, locale changes, and any
material validation gap.

## Stop and Ask

- New dependency or Zustand store
- Authentication behavior
- `next.config.ts`
- Material route/API/UX ambiguity
- Incidental shared-component change
