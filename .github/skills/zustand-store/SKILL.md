---
name: zustand-store
description: Create or extend a Zustand store using current arolariu.ro state-management patterns. Use only for genuinely global client state after confirming local state or Context is insufficient; inspect existing stores and RFC 1005 first.
---

# Zustand Store

## Use When

- Extending explicitly requested global client state
- Sharing client state across unrelated route branches
- Persisting approved client state across navigation or reload

Do not use for server data, one form, one component, or one scoped subtree.

## Inputs

- State owner and consumers
- Persisted versus transient fields
- Actions and invariants
- Rehydration and reset behavior

## Procedure

1. Read RFC 1005, the website guide, TypeScript/frontend instructions, store
   barrel, and the closest existing store plus tests.
2. Prove local state or Context is insufficient.
3. Ask before creating a new store; an explicit request may extend an existing
   store without another checkpoint.
4. Separate persisted data from transient loading/error state.
5. Reuse the existing entity-store factory and IndexedDB helpers when the
   current shape matches.
6. Write failing colocated tests for defaults, each action, reset, and
   persistence/rehydration behavior.
7. Implement the smallest state/action change.
8. Update the barrel only when an export changes.
9. Use `useShallow` for object selectors.
10. Run the targeted tests and routine website verification.

## Completion

State why global state is justified, what persists, and which tests prove the
behavior.

## Stop and Ask

- New store
- New persistence dependency or schema
- Cross-user/security-sensitive persisted data
- Public behavior ambiguity
