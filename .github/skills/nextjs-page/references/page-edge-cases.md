# Page Edge Cases

Open only for a named edge case in the route task.

## Locale parity and typed selectors

- The live dictionaries are `sites/arolariu.ro/messages/en.json`,
  `sites/arolariu.ro/messages/ro.json`, and
  `sites/arolariu.ro/messages/fr.json`; their object shape must remain
  identical.
- Current route code uses typed selector callbacks from
  `next-intl-selector` / `next-intl-selector/server`, while locale resolution
  and messages come from `next-intl`.
- `sites/arolariu.ro/messages/en.d.json.ts` is derived. Do not hand-edit it; use the
  repository-owned i18n generation mechanism after source dictionaries change.
- Translate visible labels, accessible names, status announcements, validation
  copy, and metadata. Do not concatenate grammar-sensitive fragments.
- Live pages currently select metadata from `metadata` objects, while repository
  guidance names `__metadata__`. Preserve the established sibling shape for an
  existing route. For a new namespace, stop if the live type schema and guidance
  cannot both be satisfied without a message migration.

## Missing or invalid transport data

- Validate API JSON before JSX. See
  `sites/arolariu.ro/src/types/invoices/transport.ts` and the `tryParse` call
  in
  `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`.
- Distinguish absent resource, forbidden access, malformed payload, transient
  dependency failure, and a successful empty collection.
- A `404` can call `notFound()` only when the route contract treats it as
  absence. Other typed failures need their established forbidden/error/retry
  mapping.
- Do not cast `unknown` transport data to a domain type or display internal
  provider/error text to the user.

## Guest and authenticated behavior

- Inspect `sites/arolariu.ro/src/proxy.ts`; do not assume every domain route is
  middleware-protected.
- `sites/arolariu.ro/src/app/auth/page.tsx` demonstrates a server redirect for
  an authenticated user.
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
  demonstrates explicit owner/shared/public guest rules. Those are
  security-sensitive behavior, not a reusable template.
- Preserve fail-closed behavior for protected data. Ask before changing guest
  fallback, redirects, middleware matchers, or visibility rules.

## Hydration boundaries

- Server and first client render must agree on locale, theme-sensitive
  structure, and initial data. The root handoff is
  `sites/arolariu.ro/src/app/layout.tsx` to
  `sites/arolariu.ro/src/app/providers.tsx`.
- Do not read `window`, storage, media queries, or Zustand persisted values
  during a Server Component render.
- For persisted state, render a stable loading shape until the store's live
  hydration signal is ready; do not guess from an empty array.
- `suppressHydrationWarning` at the root is not a general fix. Find the divergent
  value and move browser-only resolution behind the client boundary.

## Search parameters

- Use URL state for shareable filters and view modes. The live implementation
  and test are
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.tsx`
  and
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.test.tsx`.
- Treat every parameter as untrusted. Validate enum members, finite numbers,
  dates, repeats, empty values, and incompatible ranges before use.
- Preserve unrelated parameters when applying a partial update, remove defaults
  intentionally, and decide whether `push` or `replace` matches history
  semantics.
- Test back/forward or URL replacement behavior when it is user-observable.

## Loading, error, empty, and not-found

- A loading fallback should approximate final geometry and must not introduce a
  second `main` landmark. `sites/arolariu.ro/src/app/loading.tsx` documents
  this constraint.
- An error boundary is a Client Component. Give recovery controls semantic
  labels, log only safe diagnostics, and make `reset` observable in a test.
- Empty data is usually a successful state with explanation and a next action.
- Not-found copy and return navigation must remain route-appropriate and
  localized; inspect
  `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx`
  and its colocated test.

## Accessibility and focus

- Keep one page-level `main` (the root layout already owns the site landmark).
- Preserve a meaningful heading hierarchy and native links/buttons.
- When route content changes after an action, place focus deliberately or use a
  suitable live region; do not announce static content repeatedly.
- Error recovery, dialog entry/return, keyboard operation, and icon-only names
  are behavior to test, not visual polish.
- Route E2E examples for landmarks, headings, viewport behavior, and automated
  accessibility checks live in `sites/arolariu.ro/src/app/page.spec.tsx` and
  `sites/arolariu.ro/src/app/about/page.spec.tsx`.

## Responsive, theme, and motion behavior

- Website route styles are colocated SCSS/CSS Modules. Derive import depth,
  tokens, breakpoint mixins, and class access from a neighboring module.
- Check narrow and wide layouts, zoom/reflow, long translated strings, light and
  dark themes, focus visibility, and reduced motion.
- Do not add inline style objects. For data-driven values, prefer existing CSS
  variables or another live repository pattern and ask if no compliant pattern
  exists.

## Metadata fallback

- `sites/arolariu.ro/src/metadata.ts` owns base metadata and
  `createMetadata`; route generators supply localized overrides and current
  locale.
- A route without an override inherits base metadata. A route with localized
  metadata should not silently catch a missing selector and emit misleading
  defaults.
- Verify title and description propagation to Open Graph/Twitter using
  `sites/arolariu.ro/src/metadata.test.ts`. Derive canonical or
  dynamic-resource metadata from a current sibling rather than guessing.
