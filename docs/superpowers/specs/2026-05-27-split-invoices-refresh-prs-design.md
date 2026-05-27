# Split Invoices Refresh PRs Design

## Context

The experimentation branch `refactor/invoices-shared-infrastructure` contains a large snapshot of frontend/invoices/i18n work. PR #792 currently points from this branch to `preview` with the umbrella title `refactor(invoices): code refresh`.

The goal is to replace that umbrella PR with smaller, reviewable PRs against `preview`, grouped by subject area. The replacement branches must be independent within each wave and must not target `main`.

Current state observed during design:

- Current branch: `refactor/invoices-shared-infrastructure`
- PR #792 base: `preview`
- PR #792 head: `refactor/invoices-shared-infrastructure`
- PR #792 state: open
- Snapshot size against `preview`: ~489 files, ~51k insertions, ~32k deletions
- Snapshot size against `main`: larger and not the intended split base
- Existing unrelated dirty files in the working tree:
  - `.vscode/settings.json`
  - `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RecipeDialog.stories.tsx`

## Goals

1. Create smaller PR branches from `preview`.
2. Target every replacement PR at `preview`.
3. Keep PRs independent within each wave.
4. Pause between waves so the user can review and merge before later work is split.
5. Keep PR #792 as a temporary reference and mark/close it only after replacement PRs exist.
6. Avoid staging unrelated dirty files unless a topic explicitly owns them.

## Non-goals

- Do not merge the umbrella PR #792 as-is.
- Do not create branches targeting `main`.
- Do not create stacked PRs.
- Do not force-push shared branches.
- Do not rewrite `preview` or `main`.
- Do not create Wave 2 or Wave 3 branches before the prior wave has merged into `preview`.

## Branch topology

All replacement branches start from `preview` as it exists at that wave.

The snapshot branch is used only as the extraction source:

```text
preview
├── refactor/invoices-actions            → PR to preview
├── refactor/invoices-hooks              → PR to preview

After Wave 1 merges:

preview
├── refactor/invoices-scan-upload-flow   → PR to preview
├── refactor/invoices-filter-bar         → PR to preview
├── refactor/invoices-recipe-dialogs     → PR to preview

After Wave 2 merges:

preview
├── refactor/website-next-intl-selector  → PR to preview
├── refactor/website-message-tree        → PR to preview
```

The branches are intentionally not stacked. If one branch cannot compile without too much unrelated code, the correct action is to stop and report the dependency, not silently enlarge the branch.

## Wave plan

### Wave 1 — create now, then pause

1. `refactor/invoices-actions`
   - Scope: invoice domain server actions only.
   - Include: action files under `src/app/domains/invoices/_actions/**`, action barrel exports, and direct import/call-site updates required to compile.
   - Exclude: hook extraction, scan upload context refactor, filter bar decomposition, recipe dialog decomposition, i18n migrations.

2. `refactor/invoices-hooks`
   - Scope: invoice domain hook extraction only.
   - Include: hook files under `src/app/domains/invoices/_hooks/**` and consumers updated to use those hooks.
   - Prefer independence from `refactor/invoices-actions`; include only minimal action prerequisites if the branch cannot compile otherwise.
   - Exclude: scan upload context refactor, filter bar decomposition, recipe dialog decomposition, i18n migrations.

Stop after Wave 1 PRs are opened. The user will review and merge these PRs into `preview` before work continues.

### Wave 2 — create after Wave 1 lands in `preview`

3. `refactor/invoices-scan-upload-flow`
   - Scope: scan upload context/reducer/runner/validation and view-scans synchronization/performance.
   - Include: scan upload context, upload utilities, view-scans sync, deferred mount/scan card performance pieces that are scan-flow specific.

4. `refactor/invoices-filter-bar`
   - Scope: view-invoices filter bar/card decomposition.
   - Include: FilterBar card frame, amount/date/sort/dynamic filter cards, filter utilities, filter styles, and directly related view-invoices list refinements.

5. `refactor/invoices-recipe-dialogs`
   - Scope: recipe dialog decomposition.
   - Include: focused add/update/delete/preview/share recipe dialogs, dialog registry/context changes needed for those dialogs, related recipe dialog styles/translations, and monolithic recipe dialog removal.

Stop after Wave 2 PRs are opened and reviewed/merged.

### Wave 3 — create after Wave 2 lands in `preview`

6. `refactor/website-next-intl-selector`
   - Scope: selector API migration.
   - Include: `next-intl-selector` dependency, selector migration scripts, selector runtime/email/test conversion, typecheck import guard, and build-compatibility fixes required by the selector migration.

7. `refactor/website-message-tree`
   - Scope: message hierarchy redesign.
   - Include: message catalog rewrite, message-tree migration tooling/reports, taxonomy validation in `generate:i18n`, and call-site path updates caused by the new message tree.

Stop after Wave 3 PRs are opened.

## Extraction strategy

For each branch:

1. Start from a clean `preview` branch.
2. Extract from `refactor/invoices-shared-infrastructure` using pathspecs and selected commits.
3. Prefer path-limited checkout or patch extraction over manually recreating work.
4. Verify the diff contains only the target subject area.
5. If compile errors reveal a hard prerequisite, add the smallest required files or move the topic to a later wave.

Useful source commands during implementation:

```powershell
git --no-pager diff --name-status preview..refactor/invoices-shared-infrastructure
git --no-pager diff preview..refactor/invoices-shared-infrastructure -- <path>
git checkout refactor/invoices-shared-infrastructure -- <path>
```

## Verification

Per branch minimum:

- `npm --workspace @arolariu/website run typecheck`

Additional branch-specific verification:

- Wave 1 actions/hooks: targeted website unit tests when available; `npm run build:website` if route/server-action wiring changed.
- Later waves: use branch-specific targeted tests where obvious.

Do not run ESLint, Playwright, E2E tests, Storybook tests, full `npm run test`, or unrelated full-suite commands unless explicitly re-approved.

Before creating each PR:

- Confirm branch targets `preview`.
- Confirm dirty files are only branch-owned changes.
- Confirm unrelated existing dirty files are not staged.

## PR handling

Each PR body should include:

- Scope summary
- Files/areas extracted
- Verification run
- Dependency note (`Independent against preview` or explicit prerequisite)
- Link/reference to umbrella PR #792 as superseded context

PR #792 should remain open while the first replacement PRs are created, then be updated or closed as superseded after the replacement set exists.

## Approved decisions

- Replacement PRs target `preview`, not `main`.
- Branches are independent within each wave, not stacked.
- Use topic patch branches from `preview`.
- Wave 1 only: invoice actions and invoice hooks.
- Wave 2 only after Wave 1 merges: scan upload flow, filter bar, recipe dialogs.
- Wave 3 only after Wave 2 merges: next-intl-selector, message tree.
