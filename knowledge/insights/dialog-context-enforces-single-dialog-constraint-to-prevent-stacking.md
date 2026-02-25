---
description: "openDialog no-ops when a dialog is already open, enforcing one-dialog-at-a-time and preventing accidental stacking or race conditions in modal workflows"
type: decision
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Dialog context enforces single dialog constraint to prevent stacking

The `DialogProvider` at `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx` implements a hard constraint: only one dialog can be open at a time. When `openDialog` is called while another dialog is already active, the call silently no-ops. This is enforced by checking `currentDialog.current.type === null` before updating state.

The constraint is an architectural decision, not a limitation. Dialog stacking -- where one modal opens on top of another -- creates confusing user experiences: unclear focus management, ambiguous escape key behavior, z-index conflicts, and state cleanup complexity when the user closes dialogs in unpredictable order. By preventing stacking at the API level, the codebase eliminates an entire category of UI bugs.

The consequence is that code opening a dialog must close the current one first if a transition is needed. This makes dialog transitions explicit rather than implicit, which improves debuggability. A developer reading the code can trace exactly when and why dialog state changes, rather than reasoning about an arbitrary stack of overlapping modals.

The constraint also simplifies the context API. With single-dialog semantics, the entire dialog state is a flat triple (`type`, `mode`, `payload`) rather than a stack or queue data structure. This makes the dialog system predictable and easy to test.

---

Related Insights:
- [[dialog-context-uses-ref-plus-state-hybrid-for-reads-and-renders]] — extends: the implementation mechanism that enables single-dialog tracking
- [[dialog-types-follow-feature-double-underscore-action-naming-convention]] — enables: flat type namespace works because only one dialog is active
- [[dialog-payloads-carry-ids-not-full-objects-to-minimize-context-size]] — extends: minimal payloads complement the single-dialog constraint

Domains:
- [[frontend-patterns]]
