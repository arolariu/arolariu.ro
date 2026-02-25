---
description: "DialogProvider stores dialog state in both a useRef (for synchronous reads in callbacks) and useState (for triggering React re-renders), avoiding stale closure bugs"
type: pattern
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Dialog context uses ref-plus-state hybrid for reads and renders

The `DialogProvider` maintains dialog state in two parallel stores: a `useRef<DialogCurrent>` for immediate synchronous reads and a `useState<DialogCurrent>` for driving React re-renders. Both are updated together in `openDialog` and `closeDialog`, but they serve distinct roles in the rendering lifecycle.

The ref is essential for the single-dialog constraint. When `openDialog` checks whether a dialog is already open (`currentDialog.current.type === null`), it reads the ref, not the state. React state updates are asynchronous -- reading state inside a callback can return stale values if multiple `openDialog` calls happen in rapid succession (e.g., from a double-click). The ref always reflects the latest value, making the guard reliable even under concurrent calls.

The state drives re-renders. When the dialog changes, `setDialogState` triggers a re-render of the provider, which propagates new context values to all consuming components via `useMemo`. Without the state update, the ref change would be invisible to React and no components would re-render.

The `useMemo` on the context value is keyed to `dialogState` (the useState value), not the ref. This means the memoized context object is recreated exactly when the dialog state changes, preventing unnecessary re-renders from unrelated parent updates while still re-rendering when dialog state changes.

This dual-store pattern is a general solution for React scenarios requiring both synchronous correctness in event handlers and proper rendering reactivity.

---

Related Insights:
- [[dialog-context-enforces-single-dialog-constraint-to-prevent-stacking]] — foundation: the ref enables reliable single-dialog enforcement
- [[useShallow-selectors-prevent-unnecessary-zustand-store-re-renders]] — example: similar concern about preventing unnecessary re-renders in a different context

Domains:
- [[frontend-patterns]]
