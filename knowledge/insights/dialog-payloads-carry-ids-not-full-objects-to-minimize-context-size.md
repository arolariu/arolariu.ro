---
description: "Dialog payloads should pass entity IDs rather than full entity objects, keeping the context value small and letting the dialog component fetch its own data"
type: convention
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Dialog payloads carry IDs not full objects to minimize context size

When opening a dialog via `openDialog(type, mode, payload)`, the payload should contain entity identifiers (IDs) rather than full entity objects. For example, `openDialog("EDIT_INVOICE__MERCHANT", "edit", {merchantId: "123"})` passes the merchant ID, not the entire merchant object. The dialog component then retrieves the full entity from the relevant Zustand store using the ID.

This convention exists for three reasons. First, it keeps the context value small. The `DialogPayload` flows through React context, and large objects in context values increase serialization and comparison costs during re-renders. An ID string is negligible; a full entity with nested objects is not.

Second, it prevents stale data bugs. If a full entity object is passed as payload, the dialog holds a snapshot from the moment it was opened. If another component updates that entity (e.g., through a concurrent server action result), the dialog shows stale data. By holding only the ID and reading from the store, the dialog always reflects the latest entity state.

Third, it enforces a clean separation of concerns. The component that opens the dialog decides which dialog to open and with what context. The dialog component decides what data it needs and how to fetch it. Passing full objects blurs this boundary and creates coupling between the opener and the dialog's data requirements.

---

Related Insights:
- [[dialog-context-enforces-single-dialog-constraint-to-prevent-stacking]] — foundation: single-dialog design means payloads are always singular, not stacked
- [[dialog-types-follow-feature-double-underscore-action-naming-convention]] — extends: type+mode+ID together fully describe dialog intent
- [[useShallow-selectors-prevent-unnecessary-zustand-store-re-renders]] — enables: dialogs use selective store subscriptions to fetch data by ID

Domains:
- [[frontend-patterns]]
