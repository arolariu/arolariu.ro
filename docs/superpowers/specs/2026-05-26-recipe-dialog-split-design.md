# Recipe dialog split design

## Context

`RecipeDialog.tsx` currently owns all recipe dialog modes for the edit-invoice route: add, edit, delete, view, and share. It switches behavior through the shared `EDIT_INVOICE__RECIPE` dialog type and `DialogMode`, which makes the file large, mixes unrelated responsibilities, and keeps the add flow coupled to `mockInvoice` instead of the live edit-invoice context.

The approved refactor splits this source into focused recipe dialogs and replaces the single recipe dialog discriminator with action-specific dialog types.

## Goals

- Replace `RecipeDialog.tsx` with focused dialog components:
  - `AddRecipeDialog.tsx`
  - `UpdateRecipeDialog.tsx`
  - `DeleteRecipeDialog.tsx`
  - `PreviewRecipeDialog.tsx`
  - `ShareRecipeDialog.tsx`
- Remove the `EDIT_INVOICE__RECIPE` dialog type.
- Add dedicated recipe dialog types and payload mappings.
- Update all `useDialog` call sites to use the new dialog types.
- Keep dialog state in the existing `DialogContext` and invoice data in the existing `EditInvoiceContext`.
- Wire add, update, and delete operations to the existing recipe mutation hooks.

## Non-goals

- Do not introduce a new Zustand store or bounded context.
- Do not change recipe persistence beyond the behavior provided by the existing `useRecipeAdd`, `useRecipeUpdate`, and `useRecipeDelete` hooks.
- Do not redesign the recipe UI beyond the structure required to split responsibilities.
- Do not add new dependencies.
- Do not create Vitest unit tests as part of this migration.
- Do not run test commands during implementation.

## Selected approach

Use action-specific dialogs backed by the existing hooks and contexts.

Alternatives considered:

1. Mechanical split only: move code into files while preserving current behavior. This is the lowest-risk edit but leaves the current mock invoice and inert update/delete/share behavior in place.
2. Action dialogs with existing hooks: split by user action, use dedicated dialog types, and wire add/update/delete to existing hooks. This is the approved approach because it removes the large switch component and fixes the current mock wiring without changing architecture.
3. Action dialogs plus shared `RecipeForm`: reduce duplication between add and update by extracting a reusable form. This may be useful later, but it adds extra abstraction before the focused split has stabilized.

## Architecture

All new recipe dialogs live in:

`sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/`

`DialogContext.tsx` will replace the single recipe type with five action-specific types:

- `EDIT_INVOICE__RECIPE_ADD`
- `EDIT_INVOICE__RECIPE_UPDATE`
- `EDIT_INVOICE__RECIPE_DELETE`
- `EDIT_INVOICE__RECIPE_PREVIEW`
- `EDIT_INVOICE__RECIPE_SHARE`

`DialogContainer.tsx` will lazy-load each recipe dialog directly with `next/dynamic`. The registry switch will map each new type to its component, so no recipe mode switcher remains.

Each dialog remains a client component and uses `useDialog(<its-own-type>)` for open/close state. Dialogs that need invoice data read it from `useEditInvoiceContext()`, preserving the current provider boundary and avoiding prop drilling.

## Dialog payloads

`DialogPayloads` will define explicit payloads:

```typescript
EDIT_INVOICE__RECIPE_ADD: undefined;
EDIT_INVOICE__RECIPE_UPDATE: {recipe: Recipe};
EDIT_INVOICE__RECIPE_DELETE: {recipe: Recipe};
EDIT_INVOICE__RECIPE_PREVIEW: {recipe: Recipe};
EDIT_INVOICE__RECIPE_SHARE: {recipe: Recipe};
```

The semantic `DialogMode` remains in use for API compatibility:

- Add uses `add`.
- Update uses `edit`.
- Delete uses `delete`.
- Preview uses `view`.
- Share uses `share`.

The dialog type, not the mode, determines which component is rendered.

## Call-site changes

`RecipesTab.tsx` will open `EDIT_INVOICE__RECIPE_ADD` from the add buttons.

`RecipeCard.tsx` will open:

- `EDIT_INVOICE__RECIPE_PREVIEW` for View/Preview.
- `EDIT_INVOICE__RECIPE_UPDATE` for Edit.
- `EDIT_INVOICE__RECIPE_DELETE` for Delete.
- `EDIT_INVOICE__RECIPE_SHARE` for Share.

No `useDialog("EDIT_INVOICE__RECIPE", ...)` calls should remain after the refactor.

## Component behavior

`AddRecipeDialog` owns creation form state, builds a `Recipe`, calls `useRecipeAdd(invoice).addRecipeCallback`, shows success or error feedback, closes on success, and refreshes the route.

`UpdateRecipeDialog` owns edit form state initialized from the payload recipe, calls `useRecipeUpdate(invoice).updateRecipeCallback(originalRecipe.name, updatedRecipe)`, shows success or error feedback, closes on success, and refreshes the route.

`DeleteRecipeDialog` uses `AlertDialog`, calls `useRecipeDelete(invoice).removeRecipeCallback(recipe.name)`, shows progress and success or error feedback, closes on success, and refreshes the route.

`PreviewRecipeDialog` renders recipe details read-only using the existing recipe translation namespace.

`ShareRecipeDialog` provides a dedicated target for the existing Share menu item. If a recipe reference URL is available, the dialog can expose a safe copy/share action. If not, it should show a user-visible message explaining that recipe sharing is not yet available instead of silently doing nothing.

## Error handling

Required-recipe dialogs must explicitly handle missing payloads with a visible fallback or error state. They should not pretend success when the payload is absent.

Mutation dialogs should surface operation failures through the existing toast pattern and keep errors typed with `error instanceof Error ? error.message : String(error)`. They should not swallow failures or rely on console output as the only signal.

## Verification plan

Do not create or update Vitest unit tests for this migration.

Do not run test commands. Validation for this migration should rely on source-level checks such as confirming the old dialog type and `RecipeDialog.tsx` references are removed, verifying the new dialog types are registered, and checking that call sites open the new action-specific dialog types.

If non-test validation is needed, use only commands that are not test commands and that are explicitly allowed at implementation time.

## Acceptance criteria

- `RecipeDialog.tsx` is deleted.
- The five new recipe dialog files exist and are registered in `DialogContainer.tsx`.
- `DialogContext.tsx` exposes five recipe dialog types and payload mappings.
- No source call site opens `EDIT_INVOICE__RECIPE`.
- Add, update, and delete dialogs use the existing recipe hooks with the invoice from `EditInvoiceContext`.
- The existing Share menu action opens `ShareRecipeDialog`.
- Source-level checks confirm the old monolithic recipe dialog type and component references are gone.
