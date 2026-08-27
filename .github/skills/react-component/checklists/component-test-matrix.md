# Component Test Matrix

Select only rows affected by the component contract.

| Category | Prove | Representative source |
| --- | --- | --- |
| Render semantics | Correct element/role, heading or group relationship, accessible name, stable item keys | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.test.tsx`; `packages/components/src/components/ui/button.test.tsx` |
| Props and variants | Required/default/optional props produce the documented public behavior | Shared component sibling tests |
| Pointer interaction | Click/hover/drag path updates state or invokes callback exactly as specified | `packages/components/src/components/ui/button.test.tsx`; `packages/components/src/components/ui/tooltip.test.tsx` |
| Keyboard interaction | Tab order, Enter/Space, arrows, Escape, and bounds for the chosen widget | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.test.tsx`; `packages/components/src/components/ui/dialog.test.tsx` |
| Focus | Open/close/Escape semantics in the current dialog unit test; initial focus, trap, and close/recovery return require a browser/E2E check until a live test proves them | `packages/components/src/components/ui/dialog.test.tsx`; browser check for focus movement |
| Disabled/loading | Native or composed disabled semantics block both modalities; loading is named/busy | `packages/components/src/components/ui/button.test.tsx`; `packages/components/src/components/ui/spinner.test.tsx` |
| Error/status | Correct alert/status priority and localized copy; retry/action works | `sites/arolariu.ro/src/app/error.test.tsx` |
| Empty/dynamic list | Explicit empty state, correct list/table semantics, add/remove/reorder identity | Route table/grid tests or focused component test |
| Async/race | Loading/success/failure, stale response ignored, cancellation/unmount safe | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.test.tsx` |
| Effect cleanup | Listener, observer, timer, subscription, or abort controller is released | `sites/arolariu.ro/src/hooks/useScrollToTop.test.tsx`; relevant component test |
| Context | Provider value/actions, outside-provider error, state isolation, payload narrowing | `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx` |
| Ref/composition | Ref targets the public node; rendered element and merged handlers remain correct | `packages/components/src/components/ui/button.test.tsx` |
| Styling contract | Required class/variant only when externally meaningful; theme/responsive/reduced motion in story/browser | Matching module/story |
| Accessibility regression | Name/description/state relationships and automated audit for a complex composition | Dialog/tooltip tests; route E2E |

## Test boundaries

- Prefer roles and accessible names over test IDs; use a test ID only when no
  semantic query exists for the behavior under test.
- Use `userEvent` and await it. Directly call pure helpers only when testing the
  helper contract.
- Reuse current builders and global shims.
- Mock network, Clerk/Azure/browser SDK, or another true external boundary.
  Do not mock repository components, hooks, stores, or actions merely to make
  composition easier.
- Restore fake timers, spies, globals, and subscriptions so tests remain
  order-independent.
