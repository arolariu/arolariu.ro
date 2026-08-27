# Hydration and URL Edge Cases

Open only for hydration or URL/search-parameter behavior.

## Hydration boundaries

- Server and first client render must agree on locale, theme-sensitive
  structure, and initial data. The root handoff is
  `sites/arolariu.ro/src/app/layout.tsx` to
  `sites/arolariu.ro/src/app/providers.tsx`.
- Do not read `window`, storage, media queries, or Zustand persisted values
  during a Server Component render.
- For persisted state, render a stable loading shape until the store's live
  hydration signal is ready; do not guess from an empty array.
- `suppressHydrationWarning` at the root is not a general fix. Find the
  divergent value and move browser-only resolution behind the client
  boundary.

## Search parameters

- Use URL state for shareable filters and view modes. The live implementation
  and test are
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.tsx`
  and
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.test.tsx`.
- Treat every parameter as untrusted. Validate enum members, finite numbers,
  dates, repeats, empty values, and incompatible ranges before use.
- Preserve unrelated parameters when applying a partial update, remove
  defaults intentionally, and decide whether `push` or `replace` matches
  history semantics.
- Test back/forward or URL replacement behavior when it is user-observable.
