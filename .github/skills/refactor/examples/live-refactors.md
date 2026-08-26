# Live Refactor Examples

These are dynamic examples, not templates. Inspect the live paths before use;
historical commits explain intent but never override current source.

## Regroup Route Components Without Changing Contracts

**Verified structural commit:** `5d75d57eb` (`refactor(status): regroup
components/ into chrome/summary/table/charts/incidents`).

**Live source:**

- [`+page.svelte`](../../../../sites/status.arolariu.ro/src/routes/+page.svelte)
- [`components/chrome/`](../../../../sites/status.arolariu.ro/src/lib/components/chrome)
- [`components/summary/`](../../../../sites/status.arolariu.ro/src/lib/components/summary)
- [`components/table/`](../../../../sites/status.arolariu.ro/src/lib/components/table)
- [`components/charts/`](../../../../sites/status.arolariu.ro/src/lib/components/charts)
- [`components/incidents/`](../../../../sites/status.arolariu.ro/src/lib/components/incidents)
- [`UptimeBar.test.ts`](../../../../sites/status.arolariu.ro/src/lib/components/table/UptimeBar.test.ts)

**Preservation evidence:** `git show --find-renames --summary 5d75d57eb`
identifies 27 file renames. Inspection of the changed lines shows only import
specifier updates in the moved components, route, and colocated test: no
markup, props, events, calculations, styles, or assertions changed. The
current `UptimeBar.test.ts` still exercises the moved component's role,
callback, and accessible-label contract.

**Inspect now:** every import consumer, cross-folder dependency, route
composition, props/events, colocated tests, and current Svelte project
configuration. Characterize visible output before another move.

**Choose a different sibling when:** the proposed move also changes markup,
styling, public exports, state ownership, or component behavior.

## Extract Pure Logic from a Svelte Route

**Verified structural commit:** `46756da24` (`refactor(status): keyboard
handler to lib/routes/keyboardShortcuts`).

**Live source:**

- [`src/routes/+page.svelte`](../../../../sites/status.arolariu.ro/src/routes/+page.svelte)
- [`keyboardShortcuts.ts`](../../../../sites/status.arolariu.ro/src/lib/routes/keyboardShortcuts.ts)
- [`keyboardShortcuts.test.ts`](../../../../sites/status.arolariu.ro/src/lib/routes/keyboardShortcuts.test.ts)
- [`pageLogic.ts`](../../../../sites/status.arolariu.ro/src/lib/routes/pageLogic.ts)
- [`pageLogic.test.ts`](../../../../sites/status.arolariu.ro/src/lib/routes/pageLogic.test.ts)

**Why representative:** event decisions and pure page calculations live in
plain TypeScript with focused tests, while Svelte runtime ownership stays in
the route. This is a behavior-preserving extraction seam, not a reason to
abstract every route statement.

**Preservation evidence:** the commit diff moves the existing shortcut
branches into `createKeyboardHandler`, leaves the route as binding glue, and
adds contrasting tests for every key, modifier/editable-target suppression,
`defaultPrevented`, wraparound, and no-op branches. The moved switch retains
the same state writes and `preventDefault` conditions.

**Inspect now:** keyboard modifier/editable-target semantics, non-mutating
sorting, current runes usage, route call sites, and the colocated tests.

**Choose a different sibling when:** the behavior depends on Svelte lifecycle
or runes, DOM ownership cannot be represented by a stable function contract,
or the target belongs to a component rather than the route.

## Extract Route Contracts and Constants

**Verified structural commit:** `a04fd2ef9` (`refactor(upload-scans): extract
_types barrel and _model/constants`).

**Live source:**

- [`_types/index.ts`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_types/index.ts)
- [`_types/types.ts`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_types/types.ts)
- [`_model/constants.ts`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_model/constants.ts)
- [`_model/reducer.test.ts`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_model/reducer.test.ts)
- [`ScanUploadContext.tsx`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_context/ScanUploadContext.tsx)

**Preservation evidence:** `git show --find-renames a04fd2ef9` records an 89%
rename of `uploadTypes.ts` to `_types/types.ts`; the only contract removals
from that file are four constants copied with identical names and values into
`_model/constants.ts`. Consumer and test changes are import-path updates, and
no test assertion or runtime branch changed.

**Inspect now:** every type/constant consumer, barrel exports, route ownership,
runtime-versus-type imports, and focused reducer/upload tests. Preserve the
exact values, union members, object shapes, and export visibility.

**Choose a different sibling when:** extracting the symbol changes its value,
widens an export, alters a discriminated union, or crosses the route/package
boundary.

## Disqualifying Mixed History

These commits may explain history but must never be used as
behavior-preserving exemplars:

- `66566935d` mixes component decomposition with observable prompt changes:
  retained scans change to the last three and rendered thumbnails change from
  five to three.
- `5b34dae25` is a merge whose own description marks bug fixes and new
  features; it changes DTOs, queue behavior, service contracts, response
  fields, and analysis outcomes in addition to the service graph.
- `485adc714` changes validation result reasons and upload-runner fallback
  behavior while reorganizing code.

For mixed history, isolate a smaller proven structural commit or characterize
the live code and perform a fresh narrow transformation. Passing tests after a
mixed commit do not prove its behavior was preserved.
