# PR 792 Preview Drift Resolution Design

## Status

Approved for implementation planning.

## Context

PR 792 merges `refactor/invoices-shared-infrastructure` into `preview`.
The refactor branch is the source of truth for final code shape.

Remote `preview` was refreshed after three additional merges and currently points at
`7ae50a18b` (`refactor(invoices): split recipe dialogs (#808)`). The refactor branch
currently points at `388b1e3ad` (`docs: add wave 1 PR split plan`). The merge base is
`0108fb03dd409ae6975e610ff82d54c1b3ef43ba`.

The refreshed isolated merge simulation reports 55 unresolved conflicts:

| Conflict kind | Count |
| --- | ---: |
| Add/add | 14 |
| Modify/delete | 8 |
| Content | 33 |

The latest preview merges resolved these previously blocking conflicts:

- `sites/arolariu.ro/messages/en.json`
- `sites/arolariu.ro/messages/fr.json`
- `sites/arolariu.ro/messages/ro.json`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/RecipeDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_context/ScanUploadContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/filters/FilterBar.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.tsx`

The refreshed preview merges introduced two new conflicts:

- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.stories.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.test.tsx`

## Goals

- Resolve PR 792 conflicts with `refactor/invoices-shared-infrastructure` as the
  architectural source of truth.
- Preserve legitimate preview-only bug fixes, test assertions, and copy improvements
  when they do not contradict the refactor architecture.
- Avoid resurrecting legacy invoice files that refactor intentionally deleted,
  relocated, or decomposed.
- Keep strict frontend standards intact, including no `any`, RSC-first behavior,
  domain-local invoice infrastructure, and complete i18n coverage for visible copy.

## Non-goals

- Do not redesign the invoice UX beyond reconciling preview drift.
- Do not add new dependencies.
- Do not change backend contracts unless a conflict exposes a required existing API
  integration fix.
- Do not preserve preview file paths when refactor moved the same responsibility to
  a domain-local or decomposed location.

## Source-of-truth policy

Use a refactor-first audit strategy:

1. Start from the refactor branch version for every conflicted file.
2. Audit the preview side of each conflict hunk.
3. Classify preview drift as one of:
   - `cherry-pick`: a bug fix, test assertion, copy improvement, or API handling fix
     that remains valid in the refactor shape.
   - `superseded`: behavior or structure intentionally replaced by refactor.
   - `standards-fix`: a preview change that must override refactor to preserve
     repository standards.
   - `follow-up`: useful but outside the conflict resolution scope.
4. Port `cherry-pick` and `standards-fix` changes into the refactor-shaped files.
5. Document or discard `superseded` changes; do not keep duplicate legacy surfaces.

## Conflict categories and resolution rules

### 1. Add/add conflicts in server actions and domain hooks

Affected files:

- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/patchInvoice.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/fetchMerchant.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/fetchMerchants.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/scans/updateScan.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceDelete.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceMetadataAdd.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceMetadataRemove.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoiceShare.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/useProductAdd.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/product/useProductRemove.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanAdd.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanDelete.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/scan/useScanRotation.tsx`

Drift:

- Both branches created the same domain-local target paths after moving invoice
  actions and hooks out of legacy shared locations.
- Refactor owns the final placement, import style, and public hook/action APIs.

Resolution:

- Keep refactor file structure and import topology.
- Audit preview for API endpoint corrections, response parsing fixes, toast/copy
  improvements, and store-update fixes.
- Do not reintroduce legacy `src/lib/actions/invoices` or `src/hooks` ownership for
  invoice domain behavior.

### 2. Modify/delete conflicts for legacy invoice components and tests

Affected files:

- `sites/arolariu.ro/src/app/domains/invoices/_components/InvoiceNotFound.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/InvoicesNotFound.stories.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/InvoicesNotFound.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/LoadingInvoice.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/LoadingInvoices.stories.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/LoadingInvoices.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/ScanCard.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test.ts`

Drift:

- Preview changed legacy files after refactor deleted, replaced, or relocated the
  same responsibility.
- Refactor moved scan card assets into `_cards` and removed obsolete loading/not-found
  surfaces.

Resolution:

- Prefer deletion when refactor has intentionally removed the file.
- Port only valid behavior or story/test assertions to the new refactor location.
- Never keep both old and new versions of the same invoice surface.

### 3. Content conflicts in dialog and context architecture

Affected files:

- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.stories.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_context/EditInvoiceContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_dialogs/DeleteInvoiceDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_dialogs/ShareInvoiceDialog.Private.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_dialogs/ShareInvoiceDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AddScanDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AllergenDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/BulkCategoryDialog.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RemoveScanDialog.tsx`

Drift:

- Refactor split dialog responsibilities into explicit dialog types such as scan
  add/remove, recipe add/update/delete/preview/share, scan delete, and scan preview.
- Preview still has older combined dialog payloads and expectations in some files.

Resolution:

- Preserve refactor dialog taxonomy and payload typing.
- Migrate preview test expectations to the refactor dialog names and payloads.
- Keep accessibility and keyboard behavior from either branch when compatible.
- Avoid broad payload types or `unknown` escapes beyond the established context API.

### 4. Content conflicts in invoice pages, cards, and lists

Affected files:

- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_cards/SharingCard.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/tables/ItemsTable.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_components/tabs/RecipesTab.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/cards/ShareCollaborateCard.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/BulkActionsToolbar.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_components/ScanSelectionToolbar.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/page.tsx`

Drift:

- Preview changed user-facing pages after refactor moved cards, dialogs, and hooks.
- Refactor owns the decomposed file layout and import paths.

Resolution:

- Keep refactor page/component decomposition.
- Audit preview for user-visible fixes, missing actions, and copy improvements.
- Route copied user-facing strings through `next-intl`; do not reintroduce raw UI
  text.
- Preserve RSC/client boundaries from refactor unless preview reveals a functional
  bug that requires a targeted client boundary adjustment.

### 5. View-scans action and test conflicts

Affected files:

- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_actions/createInvoiceFromScans.ts`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test.ts`
- `sites/arolariu.ro/src/app/domains/invoices/view-scans/_hooks/useScans.test.tsx`

Drift:

- Preview updated scan-to-invoice behavior and tests while refactor deleted or
  reshaped older tests.

Resolution:

- Keep refactor runtime flow.
- Port preview assertions only when they still describe supported behavior.
- If refactor intentionally deleted a test because coverage moved elsewhere, do not
  resurrect the old file; add or update tests at the new behavioral seam instead.

### 6. Server utility conflict

Affected file:

- `sites/arolariu.ro/src/lib/utils.server.ts`

Drift:

- Refactor appears to carry unsafe `any` casts for error status extraction and JWT
  payload handling.
- Preview had safer status narrowing patterns.

Resolution:

- Treat strict TypeScript and no-`any` as a standards exception to refactor-wins.
- Preserve or restore safe unknown narrowing and typed status extraction.
- Do not use `as any`, `Record<string, any>`, or broad assertions.

## Resolution order

Resolve conflicts in this order to minimize cascading import and type failures:

1. `src/lib/utils.server.ts`
2. Domain server actions under `sites/arolariu.ro/src/app/domains/invoices/_actions`
3. Stores and domain hooks
4. Dialog context, container, stories, and tests
5. Domain dialogs
6. Pages, cards, lists, and scan screens
7. Tests and stories that depend on the resolved public seams

## Validation plan

Run the smallest commands that cover the conflict surface:

1. Isolated merge simulation against the latest `origin/preview`.
2. `npm run lint`
3. `npm run test:website`
4. `npm run build:website`

If user-facing strings are cherry-picked from preview, also run the repository i18n
generation or validation command used by the current branch before final verification.

## Implementation checklist

- [ ] Refresh `origin/preview` and `origin/refactor/invoices-shared-infrastructure`.
- [ ] Re-run the isolated merge simulation and capture the conflict list.
- [ ] Resolve each file from the refactor version first.
- [ ] Classify preview hunks as `cherry-pick`, `superseded`, `standards-fix`, or
      `follow-up`.
- [ ] Port accepted preview hunks into refactor-shaped files.
- [ ] Remove legacy files that refactor intentionally deleted.
- [ ] Update tests/stories at the refactor public seams.
- [ ] Verify no `any` or unsafe type shortcuts were introduced.
- [ ] Run validation commands and fix failures.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Preview contains real bug fixes hidden inside large content conflicts. | Require per-hunk classification before discarding preview changes. |
| Legacy component files accidentally survive alongside refactor replacements. | Treat modify/delete conflicts as deletion by default and verify imports. |
| Dialog payload drift breaks runtime behavior. | Resolve dialog context before dialogs/pages and update tests against new dialog types. |
| i18n message drift reappears after cherry-picking copy. | Route copied strings through existing `next-intl` namespaces and regenerate/check messages. |
| Refactor branch carries unsafe TypeScript in utility code. | Apply standards-fix exception for `utils.server.ts` and validate with lint/type checks. |

## Open decisions

None. The selected strategy is detailed refactor-first audit.
