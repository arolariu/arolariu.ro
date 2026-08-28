# Route UI Edge Cases

Open only for loading/error/empty/not-found behavior or route-level
accessibility, responsive, theme, and motion decisions.

## Loading, error, empty, and not-found

- A loading fallback should approximate final geometry and must not introduce
  a second `main` landmark. `sites/arolariu.ro/src/app/loading.tsx` documents
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
- When route content changes after an action, place focus deliberately or use
  a suitable live region; do not announce static content repeatedly.
- Error recovery, dialog entry/return, keyboard operation, and icon-only names
  are behavior to test, not visual polish.
- Route E2E examples for landmarks, headings, viewport behavior, and automated
  accessibility checks live in `sites/arolariu.ro/src/app/page.spec.tsx` and
  `sites/arolariu.ro/src/app/about/page.spec.tsx`.

## Responsive, theme, and motion behavior

- Website route styles are colocated SCSS/CSS Modules. Derive import depth,
  tokens, breakpoint mixins, and class access from a neighboring module.
- Check narrow and wide layouts, zoom/reflow, long translated strings, light
  and dark themes, focus visibility, and reduced motion.
- Do not add inline style objects. For data-driven values, prefer existing CSS
  variables or another live repository pattern and ask if no compliant
  pattern exists.
