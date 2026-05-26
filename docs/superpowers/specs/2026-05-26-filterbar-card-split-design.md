# FilterBar Card Split Design

## Context

`FilterBar.tsx` in `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/` is a large client component that currently owns shell layout, search debounce, mobile and desktop filter panel wrappers, filter option derivation, six card sections, label formatting, and card-specific event handlers.

The goal is a behavior-preserving refactor that keeps `FilterBar` as the mounted parent while extracting smaller sub-components in the same `filters` directory. The refactor will also split the current `FilterBar.module.scss` so shell styles stay with `FilterBar` and card-specific styles move beside the card components.

## Approved Approach

Use card-level components with centralized shell orchestration:

- `FilterBar.tsx` keeps search state, debounce behavior, filter panel open state, full invoice-store reads, derived dynamic option arrays, clear-all behavior, view-mode controls, and mobile/desktop panel composition.
- Each filter card receives `filters` and `onFiltersChange` where it needs to mutate URL-backed filter state.
- Each card owns handlers that are local to its UI, such as date preset selection, amount parsing, chip toggles, and sort value parsing.
- A shared frame component handles common card chrome so repeated border, header, active-pill, inactive-label, and dynamic-hint markup is not duplicated.
- No local React context is introduced unless implementation reveals unmanageable prop lists.

## Component Structure

Create these files in the existing `filters` directory:

- `FilterCardFrame.tsx` and `FilterCardFrame.module.scss` for shared card wrapper styling and header presentation.
- `DateFilterCard.tsx` and `DateFilterCard.module.scss` for date presets and calendar popovers.
- `AmountFilterCard.tsx` and `AmountFilterCard.module.scss` for min/max inputs and amount presets.
- `CurrencyFilterCard.tsx` and `CurrencyFilterCard.module.scss` for dynamic currency chips.
- `CategoryFilterCard.tsx` and `CategoryFilterCard.module.scss` for dynamic category chips.
- `PaymentTypeFilterCard.tsx` and `PaymentTypeFilterCard.module.scss` for dynamic payment-type chips.
- `SortFilterCard.tsx` and `SortFilterCard.module.scss` for sort selection.

`FilterBar.module.scss` should retain only shell-level styles: container, top bar, search input, filter button and badge, clear actions, view toggle, mobile sheet, desktop inline panel, and the sticky mobile show-results bar.

## Data Flow and Behavior

`InvoicesView` continues to mount `FilterBar` with the existing props. `FilterBar` continues to read the full unfiltered invoice list from `useInvoicesStore`, derive available currencies, categories, and payment types, and hide dynamic card components when the corresponding option list is empty.

Cards call `onFiltersChange(partialFilters)` directly. This keeps URL-backed filter updates explicit without forcing `FilterBar.tsx` to expose every card-specific handler. Existing behavior must be preserved:

- Search input remains debounced in `FilterBar.tsx`.
- Clear-all resets search, date, amount, categories, payment types, currencies, and sort defaults.
- Date presets continue to use `computePresetRange` and `deriveActivePreset`.
- Amount presets keep tap-to-toggle behavior.
- Currency, category, and payment-type options remain derived from the full unfiltered invoice array.
- Sort defaults to `date-desc` and keeps the existing option set.
- Mobile filters still render in a sheet with the sticky "show results" action.
- Desktop filters still render as an inline collapsible panel.

## Styling

The SCSS split should preserve existing class behavior while reducing file size:

- Shared card chrome moves to `FilterCardFrame.module.scss`.
- Card-specific layouts move into the matching card module.
- `FilterBar.module.scss` retains only shell styles.
- All SCSS modules continue using the existing frontend abstracts import and design-token functions.
- No visual redesign is intended.

## Testing and Verification

The implementation should not add dependencies or change public behavior. Verification should focus on the smallest existing commands that cover the refactor, escalating only if needed:

- Run a targeted TypeScript/lint or website test path if available.
- Run `npm run test:website` and/or `npm run build:website` if targeted validation is unavailable or insufficient.

Manual behavior checks should confirm that search, clear-all, date presets, amount presets, dynamic chips, sort selection, mobile sheet close, and desktop panel toggling still work.
