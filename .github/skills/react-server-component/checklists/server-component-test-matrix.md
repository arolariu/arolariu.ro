# Server Component Test Matrix

Select categories before implementation. Cover behavior introduced or changed;
do not turn every row into a ceremonial test.

| Category | Prove | Best-fit boundary / live pointer |
| --- | --- | --- |
| Server ownership | `page.tsx` renders/awaits server data without a page client directive; server failures map correctly | Focused async component/action test where practical; route build; `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx` |
| Rendered semantics | Correct landmark ownership, heading hierarchy, link/button roles, accessible names | Testing Library or route E2E; `sites/arolariu.ro/src/app/page.spec.tsx` |
| Client handoff | Minimal serializable props reach the owning client child; interaction remains covered by `react-client-component` | Boundary/component test for the client child |
| Loading | Hydration/request wait exposes a stable, accessible fallback with final-shape geometry | Boundary render/story plus route integration; `sites/arolariu.ro/src/app/loading.tsx` |
| Error and recovery | Typed failure renders the right state; retry/reset works; safe detail only | `sites/arolariu.ro/src/app/error.test.tsx` |
| Empty | Successful zero-data response is distinct from error and offers the intended next action | Island/component test |
| Not-found | Only the established absence condition enters not-found; return navigation is correct | `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx` plus action/page mapping |
| Translation | Selector paths render through the test shim; dictionary/schema work is covered by `react-internationalization` | Component test plus the i18n verification matrix |
| Metadata | Localized title/description/current locale reach `createMetadata`; base social fields remain | Focused generator/helper test; `sites/arolariu.ro/src/metadata.test.ts` |
| URL state | Parse defaults/invalid values/repeated keys; write/clear preserves intended params and history semantics | `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.test.tsx` |
| Accessibility/focus | Keyboard-only path, focus entry/return/recovery, live announcement, icon names | Testing Library; E2E when browser focus/route transition matters |
| Responsive/theme/motion | Required viewport reflow, long translated content, light/dark tokens, reduced motion | Story/E2E/visual check; `sites/arolariu.ro/src/app/about/page.spec.tsx` |
| Transport failure | Unknown/malformed payload is rejected at the owning private helper or Server Action boundary | Parser/helper test; use `react-server-action` for RPC behavior |
| Guest/auth | Existing redirect, forbidden/public, or protected behavior remains exact | Server route test or E2E; use `react-auth` before altering |

## Assertion discipline

- Arrange with current builders/fixtures.
- Act through roles and `userEvent`; use direct function calls for pure server
  parsers/actions.
- Assert user-observable semantics and typed boundary outcomes.
- Reuse global test shims. Mock only network, Clerk/Azure/browser SDK, or another
  true external boundary; do not mock repository modules to make a page pass.
- Include cancellation/stale-response coverage when the page can issue
  overlapping requests.
