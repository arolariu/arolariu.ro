# Dynamic Widget Accessibility

Open only for composite keyboard behavior, live regions/errors, or dynamic
list/item semantics.

## Keyboard and pointer parity

- Every pointer action must have the native or explicit keyboard equivalent.
- Composite widgets need a coherent active item, bounds behavior, Escape
  behavior, and selection contract.
- `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`
  and its test demonstrate combobox roles, `aria-activedescendant`, Arrow keys,
  Enter, Escape, click selection, and stale-response protection.
- Do not add `tabIndex=0` to every list item. Use the chosen composite-widget
  pattern or native controls.

## Live regions and errors

- Use `role="alert"`/assertive announcements for urgent errors that need
  immediate attention; use `role="status"`/polite for non-urgent progress.
- Keep the live-region node stable when possible and update concise text.
- Current examples include `sites/arolariu.ro/src/app/error.tsx`,
  `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/ItemsDialog.tsx`,
  and `packages/components/src/components/ui/spinner.tsx`.
- Do not put interactive content inside a status announcement just to make it
  discoverable.

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
