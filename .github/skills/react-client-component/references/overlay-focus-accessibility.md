# Overlay and Focus Accessibility

Open only for a dialog, popover, tooltip, focus entry/return, or focus recovery
decision.

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
  prove browser-level focus behavior, retain a focused browser/story check
  rather than weakening the contract.

## Focus entry, return, and recovery

- On opening an overlay, focus the first meaningful control or the primitive's
  documented default.
- On close, return focus to the invoking control unless the action removed it;
  then choose the nearest stable destination.
- On validation failure, focus/associate the summary or first invalid field.
- On route/async recovery, avoid moving focus for background updates; move it
  only when the user's task context changes.
- Never fix focus with arbitrary delays without a lifecycle reason and cleanup.
