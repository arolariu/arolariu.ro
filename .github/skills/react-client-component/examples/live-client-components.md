# Live Client Component Examples

These pointers are dynamic. Inspect the current consumer and test before using
one as a sibling.

## Route-local accessible combobox

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.module.scss`
- `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.test.tsx`

### Why representative

It is a route-owned Client Component with readonly controlled props, typed
server-action results, localized copy, keyboard and pointer interaction,
debouncing, stale-response invalidation, and timer cleanup.

### Inspect

Trace the combobox/listbox relationship, active option, clear/disabled states,
and overlapping request tests. Choose a simpler native/shared control when the
requested behavior is not a combobox.

## Scoped feature Context

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`

### Why representative

These contexts keep wizard/dialog behavior inside mounted invoice subtrees,
model state and actions precisely, and test provider/hook contracts.

### Inspect

Confirm the state truly belongs to one subtree, provider value stability, hook
outside-provider behavior, payload narrowing, and cleanup. Do not use Context
as a global cache or copy domain-specific dialog types elsewhere.

## Website-shared navigation

### Live source

- `sites/arolariu.ro/src/components/Navigation.tsx`
- `sites/arolariu.ro/src/components/Navigation.test.tsx`
- `sites/arolariu.ro/src/components/Navigation.module.scss`

### Why representative

It is consumed at the website shell, combines auth-aware localized navigation
with desktop/mobile interaction, and therefore belongs above a single route
but below the domain-agnostic library. Its hand-built mobile `role="dialog"`
overlay is a legacy anti-pattern: it does not reuse the shared Dialog primitive,
and its tests do not prove focus trapping or focus return.

### Inspect

Inspect all consumers and current semantics before changing it. Do not copy the
mobile overlay shell for new overlay work; use the shared Dialog-based sibling
and its modality semantics. Derive new CSS Module and external-mock patterns
from newer siblings rather than copying legacy details.

## Domain-agnostic composed button

### Live source

- `packages/components/src/components/ui/button.tsx`
- `packages/components/src/components/ui/button.module.css`
- `packages/components/src/components/ui/button.test.tsx`
- `packages/components/src/components/ui/button.stories.tsx`
- `packages/components/src/index.ts`

### Why representative

It demonstrates the explicit shared-library threshold, Base UI `useRender` and
`mergeProps`, `forwardRef`, namespace types, native default semantics, composed
non-native disabled behavior, CSS Module composition, tests, story, and export.

### Inspect

Use only for explicitly requested library work. Verify rendered element,
disabled keyboard/pointer behavior, ref target, public prop compatibility, and
barrel exports. Route components should consume it rather than reproduce it.

## Dialog and tooltip accessibility primitives

### Live source

- `packages/components/src/components/ui/dialog.tsx`
- `packages/components/src/components/ui/dialog.test.tsx`
- `packages/components/src/components/ui/tooltip.tsx`
- `packages/components/src/components/ui/tooltip.test.tsx`

### Why representative

The Base UI wrappers own portal, open state, naming, Escape, focus, hover/focus,
and composition behavior that application components should not rebuild.

### Inspect

Match the requested overlay category, test both input modalities, and inspect
known test-environment limits before deciding a browser check is required.
