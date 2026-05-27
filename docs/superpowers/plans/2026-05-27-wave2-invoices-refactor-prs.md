# Wave 2 Invoices Refactor PRs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open three independent Wave 2 PRs against `preview` for invoice filter cards, scan upload context, and recipe dialogs.

**Architecture:** Each PR starts from `origin/preview` after Wave 1 and imports only one subject area from PR #792. The branches are independent, not stacked, and each PR preserves existing product behavior while reducing component/context size.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, next-intl-selector, CSS/SCSS Modules, Vitest, Git worktrees, GitHub CLI.

---

## File structure map

### Shared plan/source files

- Source snapshot: GitHub PR #792, fetched locally as `refs/remotes/origin/pr-792-wave2-source`.
- Target base: `origin/preview`.
- Spec: `docs/superpowers/specs/2026-05-27-wave2-invoices-refactor-design.md`.
- Plan: `docs/superpowers/plans/2026-05-27-wave2-invoices-refactor-prs.md`.

### Filter cards PR

Branch: `refactor/invoices-filter-cards`

Worktree: `.worktrees/invoices-filter-cards`

Files owned by this PR:

- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterCardFrame.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterCardFrame.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/DateFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/DateFilterCard.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/AmountFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/AmountFilterCard.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/CurrencyFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/CategoryFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/PaymentTypeFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/DynamicChipFilterCard.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/SortFilterCard.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/SortFilterCard.module.scss`

### Scan upload context PR

Branch: `refactor/invoices-scan-upload-context`

Worktree: `.worktrees/invoices-scan-upload-context`

Files owned by this PR:

- Modify: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_context/ScanUploadContext.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_components/UploadArea.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_components/UploadPreview.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_components/PostUploadPrompt.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/island.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadTypes.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadValidation.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadValidation.test.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadReducer.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadReducer.test.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadRunner.ts`
- Create: `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_utils/uploadRunner.test.ts`

### Recipe dialogs PR

Branch: `refactor/invoices-recipe-dialogs`

Worktree: `.worktrees/invoices-recipe-dialogs`

Files owned by this PR:

- Modify: `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_cards/RecipeCard.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/tabs/RecipesTab.tsx`
- Delete: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/RecipeDialog.tsx`
- Delete: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/RecipeDialog.stories.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AddRecipeDialog.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AddRecipeDialog.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/UpdateRecipeDialog.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/UpdateRecipeDialog.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/DeleteRecipeDialog.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/DeleteRecipeDialog.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/PreviewRecipeDialog.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/PreviewRecipeDialog.module.scss`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/ShareRecipeDialog.tsx`
- Create: `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/ShareRecipeDialog.module.scss`
- Modify: `sites/arolariu.ro/messages/en.json`
- Modify: `sites/arolariu.ro/messages/ro.json`
- Modify: `sites/arolariu.ro/messages/fr.json`

---

## Task 1: Prepare Wave 2 source and branch isolation

**Files:**
- Read-only: PR #792 source ref
- Verify: `.worktrees/`

- [ ] **Step 1: Fetch current `preview` and the PR #792 source snapshot**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git fetch origin preview --prune
git fetch origin pull/792/head:refs/remotes/origin/pr-792-wave2-source
git --no-pager log --oneline -1 origin/preview
git --no-pager log --oneline -1 refs/remotes/origin/pr-792-wave2-source
```

Expected: both refs resolve to one commit each. `origin/preview` includes #804.

- [ ] **Step 2: Confirm the main checkout dirty file remains isolated**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager status --short
```

Expected: if `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/updateScan.ts` is still dirty, leave it untouched. Do not stage it.

- [ ] **Step 3: Verify `.worktrees/` is ignored**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git check-ignore -q .worktrees
if ($LASTEXITCODE -ne 0) { throw '.worktrees is not ignored; stop before creating worktrees.' }
```

Expected: no output and exit code `0`.

- [ ] **Step 4: Create three independent worktrees from `origin/preview`**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git worktree add .worktrees\invoices-filter-cards -b refactor/invoices-filter-cards origin/preview
git worktree add .worktrees\invoices-scan-upload-context -b refactor/invoices-scan-upload-context origin/preview
git worktree add .worktrees\invoices-recipe-dialogs -b refactor/invoices-recipe-dialogs origin/preview
git worktree list
```

Expected: all three new worktrees appear and each branch points at `origin/preview`.

- [ ] **Step 5: Commit checkpoint**

No commit is needed in this task. It only prepares isolated workspaces.

---

## Task 2: Build the filter cards PR

**Files:**
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.tsx`
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.module.scss`
- Create: filter card component and SCSS files listed in the file structure map

- [ ] **Step 1: Import only filter-card files from PR #792**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards'
git checkout refs/remotes/origin/pr-792-wave2-source -- `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\FilterBar.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\FilterBar.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\FilterCardFrame.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\FilterCardFrame.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\DateFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\DateFilterCard.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\AmountFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\AmountFilterCard.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\CurrencyFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\CategoryFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\PaymentTypeFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\DynamicChipFilterCard.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\SortFilterCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters\SortFilterCard.module.scss
git --no-pager status --short
```

Expected: only filter directory files are added or modified.

- [ ] **Step 2: Run filter branch scope guard**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards'
$changed = git --no-pager diff --name-only origin/preview...HEAD
$changed += git --no-pager diff --name-only
$bad = $changed | Where-Object { $_ -and ($_ -notlike 'sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/*') }
if ($bad) { $bad; throw 'Filter branch contains out-of-scope files.' }
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards\sites\arolariu.ro'
npm run typecheck
```

Expected: command exits `0`.

- [ ] **Step 4: Run website tests**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards\sites\arolariu.ro'
npm run test:website
```

Expected: command exits `0`.

- [ ] **Step 5: Run website build**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards'
npm run build:website
```

Expected: command exits `0`. Dynamic server usage warnings are acceptable only if the exit code is `0`.

- [ ] **Step 6: Commit the filter branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards'
git --no-pager diff --check
git add sites\arolariu.ro\src\app\domains\invoices\view-invoices\_components\filters
git commit -m "refactor(invoices): split filter cards" -m "Extract invoice filter card components and split filter-specific styles while preserving URL-backed filter behavior." -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds with only filter-card files.

- [ ] **Step 7: Push and open the filter PR**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-filter-cards'
git push -u origin refactor/invoices-filter-cards
$body = @'
## Summary
- Split the invoice FilterBar card internals into focused card components.
- Keep FilterBar as the shell for search, clear-all, view mode, mobile sheet, and derived option orchestration.
- Split shell/card styles into smaller SCSS modules.

## Validation
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website` from `sites/arolariu.ro`
- `npm run build:website`

## Scope
Wave 2 filter-card PR only. No scan upload or recipe dialog changes.
'@
gh pr create --base preview --head refactor/invoices-filter-cards --title "refactor(invoices): split filter cards" --body $body
```

Expected: GitHub prints a PR URL.

---

## Task 3: Build the scan upload context PR

**Files:**
- Modify/create scan upload files listed in the file structure map
- Modify: `sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.tsx`

- [ ] **Step 1: Import only scan upload context files from PR #792**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context'
git checkout refs/remotes/origin/pr-792-wave2-source -- `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_context\ScanUploadContext.tsx `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_components\UploadArea.tsx `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_components\UploadPreview.tsx `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_components\PostUploadPrompt.tsx `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\island.tsx `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadTypes.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadValidation.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadValidation.test.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadReducer.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadReducer.test.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadRunner.ts `
  sites\arolariu.ro\src\app\domains\invoices\upload-scans\_utils\uploadRunner.test.ts `
  sites\arolariu.ro\src\app\domains\invoices\view-scans\_hooks\useScans.tsx
git --no-pager status --short
```

Expected: only upload-scans files and `view-scans/_hooks/useScans.tsx` are added or modified.

- [ ] **Step 2: Run scan upload branch scope guard**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context'
$changed = git --no-pager diff --name-only origin/preview...HEAD
$changed += git --no-pager diff --name-only
$bad = $changed | Where-Object {
  $_ -and
  ($_ -notlike 'sites/arolariu.ro/src/app/domains/invoices/upload-scans/*') -and
  ($_ -ne 'sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.tsx')
}
if ($bad) { $bad; throw 'Scan upload branch contains out-of-scope files.' }
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Run focused scan upload tests**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context\sites\arolariu.ro'
npm run test:website -- uploadValidation.test.ts uploadReducer.test.ts uploadRunner.test.ts
```

Expected: command exits `0` and reports the three upload utility test files passing. If the runner does not accept file arguments, use the full `npm run test:website` command in Step 5 as the required test gate.

- [ ] **Step 4: Run typecheck**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context\sites\arolariu.ro'
npm run typecheck
```

Expected: command exits `0`.

- [ ] **Step 5: Run website tests**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context\sites\arolariu.ro'
npm run test:website
```

Expected: command exits `0`.

- [ ] **Step 6: Run website build**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context'
npm run build:website
```

Expected: command exits `0`. Dynamic server usage warnings are acceptable only if the exit code is `0`.

- [ ] **Step 7: Commit the scan upload branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context'
git --no-pager diff --check
git add sites\arolariu.ro\src\app\domains\invoices\upload-scans sites\arolariu.ro\src\app\domains\invoices\view-scans\_hooks\useScans.tsx
git commit -m "refactor(invoices): isolate scan upload flow" -m "Extract scan upload validation, reducer, and runner utilities while keeping upload queue state route-scoped." -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds with only scan upload files and `useScans.tsx`.

- [ ] **Step 8: Push and open the scan upload PR**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-scan-upload-context'
git push -u origin refactor/invoices-scan-upload-context
$body = @'
## Summary
- Extract scan upload validation, reducer, and runner utilities.
- Keep transient upload state route-scoped in ScanUploadContext.
- Background-sync view-scans after hydration so newly uploaded scans appear after navigation.

## Validation
- `npm run test:website -- uploadValidation.test.ts uploadReducer.test.ts uploadRunner.test.ts` from `sites/arolariu.ro`
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website` from `sites/arolariu.ro`
- `npm run build:website`

## Scope
Wave 2 scan upload context PR only. No filter-card or recipe-dialog changes.
'@
gh pr create --base preview --head refactor/invoices-scan-upload-context --title "refactor(invoices): isolate scan upload flow" --body $body
```

Expected: GitHub prints a PR URL.

---

## Task 4: Build the recipe dialogs PR

**Files:**
- Modify/create/delete recipe dialog files listed in the file structure map
- Modify locale files for new recipe dialog messages

- [ ] **Step 1: Import only recipe dialog files from PR #792**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
git checkout refs/remotes/origin/pr-792-wave2-source -- `
  sites\arolariu.ro\src\app\domains\invoices\_contexts\DialogContext.tsx `
  sites\arolariu.ro\src\app\domains\invoices\_contexts\DialogContainer.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_cards\RecipeCard.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_components\tabs\RecipesTab.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\AddRecipeDialog.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\AddRecipeDialog.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\UpdateRecipeDialog.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\UpdateRecipeDialog.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\DeleteRecipeDialog.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\DeleteRecipeDialog.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\PreviewRecipeDialog.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\PreviewRecipeDialog.module.scss `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\ShareRecipeDialog.tsx `
  sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\ShareRecipeDialog.module.scss `
  sites\arolariu.ro\messages\en.json `
  sites\arolariu.ro\messages\ro.json `
  sites\arolariu.ro\messages\fr.json
git rm sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_components\dialogs\RecipeDialog.tsx
git rm sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_components\dialogs\RecipeDialog.stories.tsx
git --no-pager status --short
```

Expected: recipe dialog/context/caller/message files are added, modified, or deleted. No `.vscode` files are present.

- [ ] **Step 2: Run recipe branch scope guard**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
$allowedPrefixes = @(
  'sites/arolariu.ro/src/app/domains/invoices/_contexts/',
  'sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_cards/',
  'sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/tabs/',
  'sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/',
  'sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/',
  'sites/arolariu.ro/messages/'
)
$changed = git --no-pager diff --name-only origin/preview...HEAD
$changed += git --no-pager diff --name-only
$bad = $changed | Where-Object {
  $path = $_
  $path -and -not ($allowedPrefixes | Where-Object { $path.StartsWith($_) })
}
if ($bad) { $bad; throw 'Recipe dialog branch contains out-of-scope files.' }
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Run source-level recipe dialog checks**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
rg 'EDIT_INVOICE__RECIPE[" :;,)<]' sites\arolariu.ro\src\app\domains\invoices -n
if ($LASTEXITCODE -eq 0) { throw 'Old EDIT_INVOICE__RECIPE type still exists.' }
rg 'RecipeDialog\.module\.scss|RecipeDialog\.tsx' sites\arolariu.ro\src\app\domains\invoices -n
if ($LASTEXITCODE -eq 0) { throw 'Old RecipeDialog references still exist.' }
if (Test-Path -LiteralPath 'sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_components\dialogs\RecipeDialog.tsx') {
  throw 'RecipeDialog.tsx still exists.'
}
```

Expected: no old recipe dialog type or old stylesheet imports remain.

- [ ] **Step 4: Run i18n generation**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
npm run generate:i18n
```

Expected: command exits `0` and confirms locale/message taxonomy validity.

- [ ] **Step 5: Run typecheck**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs\sites\arolariu.ro'
npm run typecheck
```

Expected: command exits `0`.

- [ ] **Step 6: Run website tests**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs\sites\arolariu.ro'
npm run test:website
```

Expected: command exits `0`.

- [ ] **Step 7: Run website build**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
npm run build:website
```

Expected: command exits `0`. Dynamic server usage warnings are acceptable only if the exit code is `0`.

- [ ] **Step 8: Commit the recipe dialogs branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
git --no-pager diff --check
git add sites\arolariu.ro\src\app\domains\invoices\_contexts sites\arolariu.ro\src\app\domains\invoices\edit-invoice sites\arolariu.ro\messages
git commit -m "refactor(invoices): split recipe dialogs" -m "Replace the monolithic recipe dialog with action-specific dialogs and dialog-specific SCSS modules." -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds with only recipe dialog, context, caller, and locale message files.

- [ ] **Step 9: Push and open the recipe dialogs PR**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\.worktrees\invoices-recipe-dialogs'
git push -u origin refactor/invoices-recipe-dialogs
$body = @'
## Summary
- Replace the monolithic edit-invoice recipe dialog with action-specific dialogs.
- Add dedicated recipe dialog payload types and container registrations.
- Split recipe dialog SCSS into per-dialog modules and remove the old shared recipe dialog component.

## Validation
- Source check: no `EDIT_INVOICE__RECIPE` call sites remain
- Source check: no `RecipeDialog.module.scss` imports remain
- `npm run generate:i18n`
- `npm run typecheck` from `sites/arolariu.ro`
- `npm run test:website` from `sites/arolariu.ro`
- `npm run build:website`

## Scope
Wave 2 recipe-dialog PR only. No filter-card or scan-upload changes.
'@
gh pr create --base preview --head refactor/invoices-recipe-dialogs --title "refactor(invoices): split recipe dialogs" --body $body
```

Expected: GitHub prints a PR URL.

---

## Task 5: Update umbrella PR #792 and stop

**Files:**
- No source files
- GitHub PR #792 comment

- [ ] **Step 1: Collect the Wave 2 PR URLs**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
gh pr list --head refactor/invoices-filter-cards --json url --jq '.[0].url'
gh pr list --head refactor/invoices-scan-upload-context --json url --jq '.[0].url'
gh pr list --head refactor/invoices-recipe-dialogs --json url --jq '.[0].url'
```

Expected: three PR URLs are printed.

- [ ] **Step 2: Comment on umbrella PR #792**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
$filterPr = gh pr list --head refactor/invoices-filter-cards --json url --jq '.[0].url'
$scanPr = gh pr list --head refactor/invoices-scan-upload-context --json url --jq '.[0].url'
$recipePr = gh pr list --head refactor/invoices-recipe-dialogs --json url --jq '.[0].url'
$body = @"
Wave 2 has been split into focused PRs against `preview`:

- Filter cards: $filterPr
- Scan upload context: $scanPr
- Recipe dialogs: $recipePr

These follow the merged Wave 1 PRs (#798, #800, #803, #804). I have not started any Wave 3 or out-of-scope cleanup.
"@
gh pr comment 792 --body $body
```

Expected: GitHub prints the comment URL.

- [ ] **Step 3: Confirm no accidental main checkout staging**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager status --short
```

Expected: no staged files in the main checkout. The unrelated dirty `updateScan.ts` may still appear and must remain untouched.

- [ ] **Step 4: Stop**

Do not start Wave 3 or additional cleanup. Report the three PR URLs and note that Wave 2 PRs are open.

---

## Self-review notes

- Spec coverage: Tasks 2, 3, and 4 map directly to the three approved Wave 2 PRs. Task 1 covers branch isolation and source refs. Task 5 covers the umbrella PR update and stop gate.
- Completeness scan: no task relies on unspecified file paths or unnamed commands.
- Type consistency: branch names, worktree names, and PR titles match the approved spec.
