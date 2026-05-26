# Recipe dialog SCSS split design

## Context

The recipe dialog TypeScript source has been split into focused dialog components, but all focused dialogs still import `RecipeDialog.module.scss`. That keeps style ownership coupled to a removed monolithic component and makes the new dialog boundaries incomplete.

## Goals

- Create one CSS Module per recipe dialog:
  - `AddRecipeDialog.module.scss`
  - `UpdateRecipeDialog.module.scss`
  - `DeleteRecipeDialog.module.scss`
  - `PreviewRecipeDialog.module.scss`
  - `ShareRecipeDialog.module.scss`
- Update each focused recipe dialog to import its matching module.
- Delete `RecipeDialog.module.scss` after all imports are migrated.
- Preserve existing visual behavior.

## Non-goals

- Do not redesign recipe dialogs.
- Do not rename JSX class usages unless required by the module split.
- Do not add a shared SCSS partial or keep `RecipeDialog.module.scss` as a shared base.
- Do not add dependencies.
- Do not create tests or run test/lint commands.

## Selected approach

Use per-dialog CSS Modules only and delete the old shared recipe module.

Alternatives considered:

1. Per-dialog modules only and delete the old shared file. This best matches the request and gives each dialog explicit style ownership.
2. Per-dialog modules with `RecipeDialog.module.scss` retained as a shared base. This reduces duplication but keeps the old monolithic style file alive.
3. Per-dialog modules plus a private shared partial. This is DRYer but unnecessary for the small selector set and adds abstraction before it is needed.

## Style allocation

Use the current `RecipeDialog.module.scss` as the source of truth and copy only selectors each dialog uses.

`AddRecipeDialog.module.scss` owns form-oriented selectors: `dialogContent`, `formBody`, `fieldGroup`, `fieldHeader`, ingredient row/input selectors, `timeGrid`, `timeRow`, `dialogFooter`, `footerActions`, `generateButton`, `tooltipText`, and icon helpers used by add.

`UpdateRecipeDialog.module.scss` owns the same form-oriented selectors needed by update, plus `dialogContentWide`.

`DeleteRecipeDialog.module.scss` owns only `deleteAction`.

`PreviewRecipeDialog.module.scss` owns read-only selectors: `dialogContent`, `formBody`, `fieldGroup`, `readText`, `ingredientReadList`, `timeGrid`, `timeRow`, `mutedIcon`, and `dialogFooter`.

`ShareRecipeDialog.module.scss` owns sharing layout selectors: `dialogContent`, `formBody`, `fieldGroup`, `timeRow`, `readText`, `mutedIcon`, `dialogFooter`, `footerActions`, and `saveIcon`.

Selector names may remain the same inside separate modules because CSS Modules scope them locally.

## Validation plan

Validation is source-level only:

- Search for `RecipeDialog.module.scss` imports and confirm none remain.
- Confirm each focused recipe dialog imports its matching `*.module.scss` file.
- Confirm `RecipeDialog.module.scss` is deleted.

No test or lint commands will be run.

## Acceptance criteria

- Five dialog-specific SCSS modules exist.
- The five focused recipe dialogs import their matching SCSS modules.
- `RecipeDialog.module.scss` is deleted.
- No source file imports `RecipeDialog.module.scss`.
- Visual class coverage remains equivalent to the current recipe dialog styles.
