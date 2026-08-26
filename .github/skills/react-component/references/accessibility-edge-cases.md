# Accessibility Edge Cases

Use for interactive or dynamically updated UI. Native semantics come before
ARIA.

## Native controls and names

- Use `button` for actions and `a`/Next `Link` for navigation. Do not simulate
  either with a clickable `div`.
- Associate visible labels with controls. Use a localized `aria-label` only
  when no visible name exists.
- Icon-only controls need an action-specific accessible name; decorative icons
  are hidden from assistive technology.
- Preserve `type="button"` inside forms unless submission is intended. The
  shared button and tests document this in
  `packages/components/src/components/ui/button.tsx` and
  `packages/components/src/components/ui/button.test.tsx`.

## Dialogs, popovers, and tooltips

- Reuse the matching shared Base UI primitive instead of hand-building overlay
  roles, portal behavior, dismissal, or focus trapping.
- A dialog needs a meaningful title and, when useful, a description. Verify
  focus enters, stays inside while modal, closes on Escape, and returns to the
  trigger.
- A popover is not automatically modal; choose dismissal and focus behavior
  from the current shared primitive.
- Tooltip content supplements an already named trigger; it must also open for
  keyboard focus, not hover alone, and must not contain required interaction.
- Inspect `packages/components/src/components/ui/dialog.test.tsx` and
  `packages/components/src/components/ui/tooltip.test.tsx`. If happy-dom cannot
  prove a browser-level focus behavior, retain a focused browser/story check
  rather than weakening the contract.

## Keyboard and pointer parity

- Every pointer action must have the native or explicit keyboard equivalent.
- Composite widgets need a coherent active item, bounds behavior, Escape
  behavior, and selection contract.
- `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`
  and its test demonstrate combobox roles, `aria-activedescendant`, Arrow keys,
  Enter, Escape, click selection, and stale-response protection.
- Do not add `tabIndex=0` to every list item. Use the chosen composite-widget
  pattern or native controls.

## Focus entry, return, and recovery

- On opening an overlay, focus the first meaningful control or the primitive's
  documented default.
- On close, return focus to the invoking control unless the action removed it;
  then choose the nearest stable destination.
- On validation failure, focus/associate the summary or first invalid field.
- On route/async recovery, avoid moving focus for background updates; move it
  only when the user's task context changes.
- Never fix focus with arbitrary delays without a lifecycle reason and cleanup.

## Disabled and loading states

- Native controls use `disabled` when interaction must be blocked. A composed
  non-native target needs `aria-disabled`, tab behavior, and prevention of
  pointer and keyboard activation; inspect the shared Button behavior.
- Loading state must remain named. Use `aria-busy` on the affected region and a
  concise `status` announcement when progress is not otherwise exposed.
- Avoid disabling a control without explaining progress or preserving layout.
- Loading completion must not announce every incidental render.

## Live regions and errors

- Use `role="alert"`/assertive announcements for urgent errors that need
  immediate attention; use `role="status"`/polite for non-urgent progress.
- Keep the live-region node stable when possible and update concise text.
- Current examples include `sites/arolariu.ro/src/app/error.tsx`,
  `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/ItemsDialog.tsx`,
  and `packages/components/src/components/ui/spinner.tsx`.
- Do not put interactive content inside a status announcement just to make it
  discoverable.

## Reduced motion and theme

- Preserve meaning when animation is disabled. Do not rely on motion alone to
  show selection, progress, or hierarchy.
- Website modules use the live reduced-motion mixin; inspect
  `sites/arolariu.ro/src/app/domains/invoices/_components/OnboardingOverlay.module.scss`
  and `sites/arolariu.ro/src/styles/abstracts/_mixins.scss`.
- Shared-library CSS can use the current media-query pattern, for example
  `packages/components/src/motion/Collapse.module.css`.
- Verify focus indicators and contrast in both themes and high-contrast/forced
  settings when the changed control is visually custom.

## Dynamic lists and item semantics

- Use `ul`/`ol` with `li` for ordinary lists, table semantics for tabular data,
  and widget roles only when the interaction truly forms that widget.
- Use stable domain identifiers as keys; labels or array indexes are unsafe
  when order/identity changes.
- Selection controls need item-specific localized names and a group/table
  relationship. Inspect invoice grid/table controls under
  `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/tables/`.
- Empty results remain an explicit state, not an empty list with no
  explanation.
- Inserting/removing items should preserve focus; if the focused item is
  removed, move focus to a deterministic neighbor or owning control.
