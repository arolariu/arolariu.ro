# Split Invoices Wave 1 PRs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two small independent PR branches against `preview`: one for invoice domain actions and one for invoice domain hooks, extracted from `refactor/invoices-shared-infrastructure`.

**Architecture:** Treat `refactor/invoices-shared-infrastructure` as a read-only extraction source and create fresh topic branches from `preview`. Wave 1 stops after the two PRs are pushed and opened; do not create scan-upload, filter-bar, recipe-dialog, next-intl-selector, or message-tree branches yet. The actions branch owns server-action relocation/consolidation; the hooks branch owns hook extraction and consumer rewiring, with old action imports retained if needed to stay independent.

**Tech Stack:** Git/GitHub CLI, PowerShell, npm workspaces, Next.js website typecheck/build, GitHub PRs targeting `preview`.

---

## File structure

**Source branch**

- Read only: `refactor/invoices-shared-infrastructure`

**Base branch**

- Target and extraction base: `preview`

**Wave 1 branches to create**

- `refactor/invoices-actions`
- `refactor/invoices-hooks`

**Known unrelated dirty files to preserve**

- `.vscode/settings.json`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RecipeDialog.stories.tsx`

**Action branch candidate paths**

- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/**`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/**`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/**`
- old action files under:
  - `sites/arolariu.ro/src/lib/actions/invoices/**`
  - `sites/arolariu.ro/src/lib/actions/scans/**`
- direct action import consumers only where required to compile.

**Hook branch candidate paths**

- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/**`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/merchant/**`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/**`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/**`
- old hook files under `sites/arolariu.ro/src/hooks/useInvoice*.tsx`, `useInvoices.tsx`, `useMerchant.tsx`, `useMerchants.tsx`
- `sites/arolariu.ro/src/hooks/index.ts`
- `sites/arolariu.ro/src/hooks/index.test.ts`
- direct hook consumers only where required to compile.

---

### Task 1: Preflight and branch-source inventory

**Files:**
- Read: git state
- Read: diff inventories from `preview..refactor/invoices-shared-infrastructure`

- [ ] **Step 1: Confirm starting branch and preserve dirty files**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git branch --show-current
git --no-pager status --short
```

Expected:

```text
refactor/invoices-shared-infrastructure
 M .vscode/settings.json
 D sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RecipeDialog.stories.tsx
```

Do not stage those two dirty files in any Wave 1 commit unless explicitly instructed.

- [ ] **Step 2: Fetch branch refs**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git fetch origin preview refactor/invoices-shared-infrastructure
```

Expected: command exits successfully.

- [ ] **Step 3: Generate Wave 1 inventory files outside git**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
$out = 'C:\Users\aolariu\.copilot\session-state\wave1-split'
New-Item -ItemType Directory -Force -Path $out | Out-Null
git --no-pager diff --name-status preview..refactor/invoices-shared-infrastructure -- `
  'sites/arolariu.ro/src/app/domains/invoices/_actions/**' `
  'sites/arolariu.ro/src/lib/actions/invoices/**' `
  'sites/arolariu.ro/src/lib/actions/scans/**' `
  > "$out\actions-name-status.txt"
git --no-pager diff --name-status preview..refactor/invoices-shared-infrastructure -- `
  'sites/arolariu.ro/src/app/domains/invoices/_hooks/**' `
  'sites/arolariu.ro/src/hooks/useInvoice.tsx' `
  'sites/arolariu.ro/src/hooks/useInvoices.tsx' `
  'sites/arolariu.ro/src/hooks/useMerchant.tsx' `
  'sites/arolariu.ro/src/hooks/useMerchants.tsx' `
  'sites/arolariu.ro/src/hooks/index.ts' `
  'sites/arolariu.ro/src/hooks/index.test.ts' `
  > "$out\hooks-name-status.txt"
Get-Content "$out\actions-name-status.txt" | Select-Object -First 80
Get-Content "$out\hooks-name-status.txt" | Select-Object -First 80
```

Expected:

- Actions inventory includes domain `_actions/**` additions/renames and old `src/lib/actions/invoices/**` / `src/lib/actions/scans/**` deletions.
- Hooks inventory includes domain `_hooks/**` additions/renames and old root hook removals.

- [ ] **Step 4: Create a PR body template file**

Create `C:\Users\aolariu\.copilot\session-state\wave1-split\pr-template.md` with:

```markdown
## Summary
- Extracted from umbrella PR #792 into a focused Wave 1 branch.
- Targets `preview`.
- Scope is provided by the branch-specific PR body in the execution step.

## Verification
- [ ] `npm --workspace @arolariu/website run typecheck`
- [ ] `npm run build:website` (if route/server-action wiring changed)

## Dependency note
Independent against `preview`.

## Supersedes
Part of the split replacement for #792.
```

- [ ] **Step 5: Commit nothing in preflight**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager status --short
```

Expected: only the two pre-existing dirty files remain.

---

### Task 2: Create `refactor/invoices-actions`

**Files:**
- Create/modify from snapshot:
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/analyzeInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/createInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/deleteInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoices.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/metadata/addInvoiceMetadata.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/metadata/deleteInvoiceMetadata.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/metadata/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/patchInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/addInvoiceProduct.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/deleteInvoiceProduct.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/scans/attachInvoiceScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/scans/createInvoiceScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/scans/deleteInvoiceScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/scans/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/updateInvoice.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/fetchMerchant.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/fetchMerchants.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/createScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/deleteScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/fetchScans.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/generateSasUrl.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/index.test.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/markScansAsUsed.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/registerScan.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/updateScan.ts`
- Delete old action files only if their consumers are rewired:
  - `sites/arolariu.ro/src/lib/actions/invoices/**`
  - `sites/arolariu.ro/src/lib/actions/scans/**`

- [ ] **Step 1: Create a fresh branch from preview**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git switch preview
git pull --ff-only origin preview
git switch -c refactor/invoices-actions
```

Expected: branch is `refactor/invoices-actions`.

- [ ] **Step 2: Extract action files from source branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git checkout refactor/invoices-shared-infrastructure -- `
  'sites/arolariu.ro/src/app/domains/invoices/_actions/invoices' `
  'sites/arolariu.ro/src/app/domains/invoices/_actions/merchants' `
  'sites/arolariu.ro/src/app/domains/invoices/_actions/scans'
```

Expected: new `_actions/**` files appear as added/modified.

- [ ] **Step 3: Rewire direct action imports**

Run this search:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg '@/lib/actions/(invoices|scans)|@/lib/actions/invoices|@/lib/actions/scans' sites\arolariu.ro\src -n --glob '*.{ts,tsx}'
```

For each match that imports invoice-domain actions, replace imports with the domain action barrels. Use these mappings:

```ts
// Old
import {fetchInvoices} from "@/lib/actions/invoices";
import {fetchScans} from "@/lib/actions/scans";

// New
import {fetchInvoices} from "@/app/domains/invoices/_actions/invoices";
import {fetchScans} from "@/app/domains/invoices/_actions/scans";
```

If the `@` alias path does not resolve from the file because it is already inside `src/app/domains/invoices`, prefer relative imports used by the snapshot:

```ts
import {fetchInvoices} from "../_actions/invoices";
import {fetchScans} from "../_actions/scans";
```

- [ ] **Step 4: Typecheck the actions branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\sites\arolariu.ro'
npm run typecheck
```

Expected: typecheck passes. If it fails only because a consumer imports an old action path, update that import. If it fails because hook extraction is required, stop and report the dependency instead of importing hook changes.

- [ ] **Step 5: Run website build if typecheck changed route/server-action wiring**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
npm run build:website
```

Expected: build passes. If build fails due unrelated pre-existing dynamic server usage warnings but exits `0`, continue. If it exits non-zero, fix only action-branch-owned failures.

- [ ] **Step 6: Review branch diff scope**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager diff --name-status preview...HEAD
```

Expected: changed files are limited to `_actions/**`, direct action consumers, and deleted old action files. No hooks, filter bar, scan upload context, recipe dialog split, next-intl selector, or message-tree files should appear.

- [ ] **Step 7: Commit the actions branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add sites\arolariu.ro\src
git restore --staged -- .vscode\settings.json sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\RecipeDialog.stories.tsx
git commit -m "refactor(invoices): consolidate domain server actions" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: one commit containing only action branch scope.

- [ ] **Step 8: Push and create PR against preview**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git push -u origin refactor/invoices-actions
$body = @'
## Summary
- Extracts invoice domain server actions from umbrella PR #792.
- Consolidates invoice, product, merchant, metadata, and scan actions under `sites/arolariu.ro/src/app/domains/invoices/_actions`.
- Rewires direct action imports needed for the branch to compile.

## Verification
- [ ] `npm --workspace @arolariu/website run typecheck`
- [ ] `npm run build:website`

## Dependency note
Independent against `preview`.

## Supersedes
Part of the split replacement for #792.
'@
gh pr create --base preview --head refactor/invoices-actions --title "refactor(invoices): consolidate domain server actions" --body $body
```

Expected: GitHub returns a PR URL targeting `preview`.

---

### Task 3: Create `refactor/invoices-hooks`

**Files:**
- Create/modify from snapshot:
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoice.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceDelete.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceShare.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceMetadataAdd.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceMetadataRemove.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useRecipeAdd.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useRecipeDelete.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useRecipeUpdate.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/merchant/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/merchant/useMerchant.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/merchant/useMerchants.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/useProductAdd.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/useProductRemove.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/index.ts`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanAdd.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanDelete.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanRename.tsx`
  - `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanRotation.tsx`
  - `sites/arolariu.ro/src/hooks/index.ts`
  - `sites/arolariu.ro/src/hooks/index.test.ts`
- Delete/move old root hooks if branch remains independent:
  - `sites/arolariu.ro/src/hooks/useInvoice.tsx`
  - `sites/arolariu.ro/src/hooks/useInvoices.tsx`
  - `sites/arolariu.ro/src/hooks/useMerchant.tsx`
  - `sites/arolariu.ro/src/hooks/useMerchants.tsx`

- [ ] **Step 1: Return to preview and create hook branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git switch preview
git pull --ff-only origin preview
git switch -c refactor/invoices-hooks
```

Expected: branch is `refactor/invoices-hooks`.

- [ ] **Step 2: Extract hook files from source branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git checkout refactor/invoices-shared-infrastructure -- `
  'sites/arolariu.ro/src/app/domains/invoices/_hooks' `
  'sites/arolariu.ro/src/hooks/index.ts' `
  'sites/arolariu.ro/src/hooks/index.test.ts'
```

Expected: new `_hooks/**` files appear and root `src/hooks/index.ts` is updated.

- [ ] **Step 3: Preserve branch independence from actions if possible**

Search extracted hooks for domain action imports:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg '_actions|@/app/domains/invoices/_actions|\\.\\./\\.\\./_actions' sites\arolariu.ro\src\app\domains\invoices\_hooks -n --glob '*.{ts,tsx}'
```

If matches exist, prefer mapping them back to existing `preview` action imports so this PR stays independent:

```ts
// Prefer in hooks branch if preview still has these action barrels
import {fetchInvoices} from "@/lib/actions/invoices";
import {fetchScans} from "@/lib/actions/scans";
```

If a hook uses a new action that does not exist in `preview` (`patchInvoice`, metadata/product action additions, or scan update actions), stop and report that the hooks PR depends on the actions PR. Do not silently include the whole actions branch unless the user explicitly approves.

- [ ] **Step 4: Rewire hook consumers**

Search current branch for root-hook imports:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg '@/hooks|from "@/hooks"|from ".*src/hooks' sites\arolariu.ro\src\app\domains\invoices -n --glob '*.{ts,tsx}'
```

Update invoice-domain consumers to use the domain hook barrels:

```ts
import {useInvoice, useInvoices} from "../_hooks/invoice";
import {useMerchant, useMerchants} from "../_hooks/merchant";
import {useProductAdd, useProductRemove} from "../_hooks/product";
import {useScanAdd, useScanDelete, useScanRename, useScanRotation} from "../_hooks/scan";
```

Use the correct relative path from the consumer file. Do not update unrelated non-invoice consumers.

- [ ] **Step 5: Typecheck the hooks branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\sites\arolariu.ro'
npm run typecheck
```

Expected: typecheck passes. If it fails because hooks need new actions, stop and report the exact missing action files so the user can decide whether to merge actions first or allow a minimal dependency.

- [ ] **Step 6: Review hook branch diff scope**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager diff --name-status preview...HEAD
```

Expected: changed files are limited to `_hooks/**`, root hook barrel/test updates, and direct hook consumers. No scan upload context, filter bar decomposition, recipe dialog split, next-intl selector, or message-tree files should appear.

- [ ] **Step 7: Commit the hooks branch**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add sites\arolariu.ro\src
git restore --staged -- .vscode\settings.json sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\RecipeDialog.stories.tsx
git commit -m "refactor(invoices): extract domain hooks" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: one commit containing only hooks branch scope.

- [ ] **Step 8: Push and create PR against preview**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git push -u origin refactor/invoices-hooks
$body = @'
## Summary
- Extracts invoice domain hooks from umbrella PR #792.
- Moves invoice, merchant, product, recipe, and scan hooks under `sites/arolariu.ro/src/app/domains/invoices/_hooks`.
- Rewires invoice-domain consumers to domain hook barrels.

## Verification
- [ ] `npm --workspace @arolariu/website run typecheck`

## Dependency note
Independent against `preview` unless noted otherwise in comments.

## Supersedes
Part of the split replacement for #792.
'@
gh pr create --base preview --head refactor/invoices-hooks --title "refactor(invoices): extract domain hooks" --body $body
```

Expected: GitHub returns a PR URL targeting `preview`.

---

### Task 4: Update umbrella PR #792 and stop

**Files:**
- No repository files
- GitHub PR comment/update only

- [ ] **Step 1: Record created PR URLs**

Run:

```powershell
gh pr list --base preview --head refactor/invoices-actions --json number,title,url
gh pr list --base preview --head refactor/invoices-hooks --json number,title,url
```

Expected: both new PRs are listed.

- [ ] **Step 2: Comment on PR #792**

Run:

```powershell
$actionsPrUrl = gh pr view refactor/invoices-actions --json url --jq '.url'
$hooksPrUrl = gh pr view refactor/invoices-hooks --json url --jq '.url'
$comment = @'
This umbrella PR is being split into smaller preview-targeted PRs.

Wave 1 replacements:
- ACTIONS_PR_URL
- HOOKS_PR_URL

Keeping this PR open as reference while Wave 1 is reviewed.
'@
$comment = $comment.Replace("ACTIONS_PR_URL", $actionsPrUrl).Replace("HOOKS_PR_URL", $hooksPrUrl)
gh pr comment 792 --body $comment
```

Expected: comment is added to #792.

- [ ] **Step 3: Stop before Wave 2**

Do not create:

- `refactor/invoices-scan-upload-flow`
- `refactor/invoices-filter-bar`
- `refactor/invoices-recipe-dialogs`
- `refactor/website-next-intl-selector`
- `refactor/website-message-tree`

Report the two Wave 1 PR URLs and wait for user review/merge instruction.
