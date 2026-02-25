---
description: "Dialog type identifiers use FEATURE__ACTION format (e.g., EDIT_INVOICE__MERCHANT, VIEW_INVOICES__EXPORT) to encode both the feature domain and the specific operation"
type: convention
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Dialog types follow FEATURE double-underscore ACTION naming convention

All dialog type identifiers in the `DialogType` union use a structured naming pattern: `FEATURE__ACTION`, where the double underscore separates the feature domain from the specific dialog operation. Examples include `EDIT_INVOICE__ANALYSIS`, `VIEW_INVOICES__EXPORT`, and `SHARED__INVOICE_DELETE`. The `SHARED` prefix marks dialogs reusable across multiple feature contexts.

This naming convention serves three purposes. First, it creates a scannable namespace -- developers can quickly find all dialogs related to invoice editing by searching for `EDIT_INVOICE__`. Second, it makes the dialog's purpose self-documenting in code -- `openDialog("EDIT_INVOICE__MERCHANT", "edit", payload)` reads as a sentence describing the operation. Third, it prevents naming collisions as the dialog system grows, because each type encodes both its feature context and its specific role.

The convention is enforced through TypeScript's string literal union type `DialogType`, which means any misspelled or non-conforming dialog name produces a compile error. The exhaustive union also enables IDE autocomplete, so developers discover available dialogs through the type system rather than searching documentation.

The `DialogMode` type (`view`, `add`, `edit`, `delete`, `share`) is orthogonal to `DialogType` -- the same dialog can operate in different modes, reducing the total number of dialog types needed.

---

Related Insights:
- [[dialog-context-enforces-single-dialog-constraint-to-prevent-stacking]] — foundation: naming matters more when only one dialog is active at a time
- [[dialog-payloads-carry-ids-not-full-objects-to-minimize-context-size]] — extends: mode+payload complement the type to fully describe dialog intent

Domains:
- [[frontend-patterns]]
