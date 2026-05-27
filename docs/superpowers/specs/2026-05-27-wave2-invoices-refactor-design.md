# Wave 2 invoices refactor design

Date: 2026-05-27
Status: Approved for implementation planning

## Goal

Split the remaining Wave 2 work from umbrella PR #792 into three focused, reviewable PRs against `preview`:

1. `refactor/invoices-filter-cards`
2. `refactor/invoices-scan-upload-context`
3. `refactor/invoices-recipe-dialogs`

Each branch starts from the merged `origin/preview` tip after Wave 1. The branches are independent and must not be stacked on one another.

## Current context

Wave 1 is complete:

- #798 moved invoice server actions into the invoice domain.
- #800 added `next-intl-selector`.
- #803 reorganized the message tree.
- #804 extracted invoice-domain hooks.

The active source snapshot remains PR #792 / `refactor/invoices-shared-infrastructure`. That branch contains more work than Wave 2, so implementation must cherry-pick or copy only the files belonging to the current Wave 2 subject area.

The main checkout currently has an unrelated dirty file:

- `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/updateScan.ts`

Do not modify, stage, revert, or include that file unless a Wave 2 task explicitly needs it and the user approves.

## Branch and PR topology

Create three worktrees under `.worktrees/`, all based on `origin/preview`:

```text
.worktrees/
  invoices-filter-cards/          -> refactor/invoices-filter-cards
  invoices-scan-upload-context/   -> refactor/invoices-scan-upload-context
  invoices-recipe-dialogs/        -> refactor/invoices-recipe-dialogs
```

Open all three PRs against `preview`. Use #792 only as the reference snapshot and comment back to #792 after the Wave 2 PRs are opened.

Do not include selector, message-tree, Wave 1 actions, Wave 1 hooks, export/share dialog, scan-card, or acknowledgement-page work in Wave 2 branches unless required by a direct compile conflict.

## PR 1: Filter cards

### Scope

Refactor `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.tsx` from one large client component into smaller filter-card components in the same directory.

Expected files include:

- `FilterBar.tsx`
- `FilterBar.module.scss`
- `FilterCardFrame.tsx`
- `FilterCardFrame.module.scss`
- `DateFilterCard.tsx`
- `DateFilterCard.module.scss`
- `AmountFilterCard.tsx`
- `AmountFilterCard.module.scss`
- `CurrencyFilterCard.tsx`
- `CategoryFilterCard.tsx`
- `PaymentTypeFilterCard.tsx`
- `DynamicChipFilterCard.module.scss`
- `SortFilterCard.tsx`
- `SortFilterCard.module.scss`

### Design

Keep `FilterBar` as the mounted parent and shell orchestrator. It continues to own search debounce, mobile sheet state, view-mode controls, clear-all behavior, invoice-store reads, and derived option arrays.

Move card-specific UI and handlers into focused components:

- `DateFilterCard` owns date presets and calendar selection.
- `AmountFilterCard` owns amount inputs and presets.
- `CurrencyFilterCard`, `CategoryFilterCard`, and `PaymentTypeFilterCard` share dynamic chip card behavior.
- `SortFilterCard` owns sort selection.
- `FilterCardFrame` owns repeated card chrome.

No behavior or URL state semantics should change. Cards receive `filters` and `onFiltersChange` and update URL-backed filter state through the existing callback.

### Validation

Run the smallest useful website validation for this PR:

- targeted filter-card tests if available
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website` if targeted coverage is insufficient
- `npm run build:website`

## PR 2: Scan upload context

### Scope

Refactor `sites/arolariu.ro/src/app/domains/invoices/upload-scans/` so upload state transitions, validation, and upload execution are isolated from the route provider.

Expected files include:

- `upload-scans/_context/ScanUploadContext.tsx`
- `upload-scans/_components/UploadArea.tsx`
- `upload-scans/_components/UploadPreview.tsx`
- `upload-scans/_components/PostUploadPrompt.tsx`
- `upload-scans/island.tsx`
- `upload-scans/_utils/uploadTypes.ts`
- `upload-scans/_utils/uploadValidation.ts`
- `upload-scans/_utils/uploadValidation.test.ts`
- `upload-scans/_utils/uploadReducer.ts`
- `upload-scans/_utils/uploadReducer.test.ts`
- `upload-scans/_utils/uploadRunner.ts`
- `upload-scans/_utils/uploadRunner.test.ts`
- `view-scans/_hooks/useScans.tsx`

### Design

Keep upload queue state route-scoped because it contains browser-only transient data: `File`, object URL previews, progress, attempts, local errors, and completion metadata.

Extract a small upload utility module:

- `uploadTypes.ts` defines queue item types, status literals, constants, and typed runner results.
- `uploadValidation.ts` validates input, drop, and paste files through one rule set.
- `uploadReducer.ts` owns pure queue transitions and session stats.
- `uploadRunner.ts` owns the per-file SAS/direct-upload/register/fallback journey and retry policy.

`ScanUploadContext.tsx` remains the integration point. It wires the reducer, runner, toasts, object URL cleanup, progress batching, and context API.

Do not persist uploaded scan entities directly into `useScansStore` from the upload route. `view-scans` remains the source of truth. To guarantee a fresh handoff after upload, `view-scans/_hooks/useScans.tsx` should background-sync from Azure after IndexedDB hydration, while still rendering cached scans immediately.

### Validation

Run focused unit tests for the extracted utilities plus website validation:

- `uploadValidation.test.ts`
- `uploadReducer.test.ts`
- `uploadRunner.test.ts`
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website`
- `npm run build:website`

## PR 3: Recipe dialogs

### Scope

Replace the monolithic edit-invoice recipe dialog with action-specific dialogs and complete the matching SCSS split.

Expected files include:

- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.tsx`
- `edit-invoice/[id]/_cards/RecipeCard.tsx`
- `edit-invoice/[id]/_components/tabs/RecipesTab.tsx`
- delete `edit-invoice/[id]/_components/dialogs/RecipeDialog.tsx`
- delete `edit-invoice/[id]/_components/dialogs/RecipeDialog.stories.tsx`
- `edit-invoice/[id]/_dialogs/AddRecipeDialog.tsx`
- `edit-invoice/[id]/_dialogs/UpdateRecipeDialog.tsx`
- `edit-invoice/[id]/_dialogs/DeleteRecipeDialog.tsx`
- `edit-invoice/[id]/_dialogs/PreviewRecipeDialog.tsx`
- `edit-invoice/[id]/_dialogs/ShareRecipeDialog.tsx`
- one matching CSS Module per new recipe dialog
- locale messages needed for the split dialogs

### Design

Replace `EDIT_INVOICE__RECIPE` with action-specific dialog types:

- `EDIT_INVOICE__RECIPE_ADD`
- `EDIT_INVOICE__RECIPE_UPDATE`
- `EDIT_INVOICE__RECIPE_DELETE`
- `EDIT_INVOICE__RECIPE_PREVIEW`
- `EDIT_INVOICE__RECIPE_SHARE`

`DialogContext.tsx` owns the typed payload mapping. `DialogContainer.tsx` lazy-loads each focused dialog directly. Recipe callers open the action-specific dialog that matches the user action.

Dialog payloads:

```typescript
EDIT_INVOICE__RECIPE_ADD: undefined;
EDIT_INVOICE__RECIPE_UPDATE: {recipe: Recipe};
EDIT_INVOICE__RECIPE_DELETE: {recipe: Recipe};
EDIT_INVOICE__RECIPE_PREVIEW: {recipe: Recipe};
EDIT_INVOICE__RECIPE_SHARE: {recipe: Recipe};
```

Add, update, and delete dialogs use the existing recipe hooks introduced in Wave 1 and read the current invoice from `EditInvoiceContext`. Preview is read-only. Share must show a visible unavailable state if there is no safe recipe share target.

Include the recipe SCSS split in this same PR because those module imports depend on the new focused dialog files. Delete the old shared recipe dialog stylesheet after all imports are migrated.

### Validation

Validate this PR with source-level checks and website gates:

- no source references to `EDIT_INVOICE__RECIPE`
- no imports of `RecipeDialog.module.scss`
- `RecipeDialog.tsx` is deleted
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website`
- `npm run build:website`

## Shared constraints

- Do not add dependencies.
- Do not use `any`.
- Keep user-facing strings in the selector-based next-intl message tree.
- Preserve CSS Modules and SCSS Modules; do not introduce inline styles.
- Preserve route boundaries and avoid new Zustand stores.
- Keep server action imports direct when Turbopack needs module-level default imports.
- Do not force-push `main` or `preview`.
- Do not revert user changes in the main checkout.

## Acceptance criteria

- Three PRs are opened against `preview`, one per subject area.
- Each PR diff is limited to its subject area and direct compile/test prerequisites.
- Each PR includes validation evidence in the PR body.
- Umbrella PR #792 is updated with the Wave 2 PR links.
- Work stops after opening Wave 2 PRs unless the user explicitly asks to continue.
