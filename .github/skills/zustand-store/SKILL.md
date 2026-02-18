---
name: zustand-store
description: 'Creates Zustand stores with IndexedDB persistence, TypeScript strict typing, and comprehensive test coverage following arolariu.ro state management patterns from RFC 1005.'
---

# Zustand Store Scaffolding

Generates Zustand stores following the arolariu.ro state management patterns.

## When to Use

- Adding global client-side state
- State that persists across page navigations
- State shared between multiple components
- Replacing prop drilling beyond 2 levels

## When NOT to Use

- Server-only data: Use Server Components with direct fetching
- Form state: Use `useState` or react-hook-form
- Component-scoped state: Use `useState` or `useReducer`
- Theme/locale: Use React Context

## Store Template

```typescript
// sites/arolariu.ro/src/stores/[entity]Store.ts
import {create} from "zustand";
import {persist} from "zustand/middleware";
import {indexedDBStorage} from "@/stores/indexedDBStorage";

/**
 * State shape for the [Entity] store.
 */
interface [Entity]StoreState {
  /** The current list of [entities]. */
  readonly items: [Entity][];
  /** Whether the store is loading data. */
  readonly isLoading: boolean;
  /** The last error that occurred. */
  readonly error: Error | null;
}

/**
 * Actions available on the [Entity] store.
 */
interface [Entity]StoreActions {
  /** Fetches all [entities] from the API. */
  fetchAll: () => Promise<void>;
  /** Adds a new [entity] to the store. */
  add: (item: [Entity]) => void;
  /** Updates an existing [entity]. */
  update: (id: string, item: Partial<[Entity]>) => void;
  /** Removes an [entity] by ID. */
  remove: (id: string) => void;
  /** Resets the store to initial state. */
  reset: () => void;
}

type [Entity]Store = [Entity]StoreState & [Entity]StoreActions;

const initialState: [Entity]StoreState = {
  items: [],
  isLoading: false,
  error: null,
};

/**
 * Zustand store for [Entity] management with IndexedDB persistence.
 * @see RFC 1005 for state management patterns.
 */
export const use[Entity]Store = create<[Entity]Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchAll: async () => {
        set({isLoading: true, error: null});
        try {
          const items = await fetch[Entities]();
          set({items, isLoading: false});
        } catch (error) {
          set({
            error: error instanceof Error ? error : new Error("Failed to fetch"),
            isLoading: false,
          });
        }
      },

      add: (item) => {
        set((state) => ({items: [...state.items, item]}));
      },

      update: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? {...item, ...updates} : item,
          ),
        }));
      },

      remove: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "[entity]-store",
      storage: indexedDBStorage,
      partialize: (state) => ({
        items: state.items,
        // Don't persist loading/error state
      }),
    },
  ),
);
```

## Test Template

```typescript
// sites/arolariu.ro/src/stores/__tests__/[entity]Store.test.tsx
import {describe, expect, it, beforeEach, vi} from "vitest";
import {act} from "@testing-library/react";
import {use[Entity]Store} from "../[entity]Store";

// Mock IndexedDB storage
vi.mock("@/stores/indexedDBStorage", () => ({
  indexedDBStorage: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe("use[Entity]Store", () => {
  beforeEach(() => {
    // Reset store between tests
    act(() => {
      use[Entity]Store.getState().reset();
    });
  });

  it("should have correct initial state", () => {
    const state = use[Entity]Store.getState();
    expect(state.items).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should add an item", () => {
    const item = {id: "1", name: "Test"};
    act(() => {
      use[Entity]Store.getState().add(item);
    });
    expect(use[Entity]Store.getState().items).toContainEqual(item);
  });

  it("should update an item", () => {
    const item = {id: "1", name: "Original"};
    act(() => {
      use[Entity]Store.getState().add(item);
      use[Entity]Store.getState().update("1", {name: "Updated"});
    });
    expect(use[Entity]Store.getState().items[0]?.name).toBe("Updated");
  });

  it("should remove an item", () => {
    const item = {id: "1", name: "Test"};
    act(() => {
      use[Entity]Store.getState().add(item);
      use[Entity]Store.getState().remove("1");
    });
    expect(use[Entity]Store.getState().items).toHaveLength(0);
  });

  it("should reset to initial state", () => {
    act(() => {
      use[Entity]Store.getState().add({id: "1", name: "Test"});
      use[Entity]Store.getState().reset();
    });
    expect(use[Entity]Store.getState().items).toEqual([]);
  });
});
```

## Checklist

- [ ] State and Actions interfaces are separate
- [ ] Initial state is defined as a constant
- [ ] IndexedDB persistence configured via `indexedDBStorage`
- [ ] `partialize` excludes loading/error state from persistence
- [ ] `reset()` action restores initial state
- [ ] Error handling in async actions
- [ ] Tests reset store in `beforeEach`
- [ ] Tests cover: initial state, add, update, remove, reset
- [ ] No `any` types
- [ ] JSDoc on store and all actions

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Prerequisites
- Confirm feature scope and expected behavior before creating or modifying files.
- Identify whether this task changes architecture-sensitive behavior and trigger RFC grounding.

### Required Context Reads
- `.github/instructions/frontend.instructions.md`
- `.github/instructions/typescript.instructions.md`
- `docs/rfc/1005-state-management-zustand.md`
- `sites/arolariu.ro/src/stores/index.ts`

### File Mutation Boundaries
- Allowed: `sites/arolariu.ro/src/stores/**`, related hooks/tests/messages as needed.
- Disallowed: unrelated domain logic or infrastructure edits.

### Validation Commands
```bash
npm run build:website
npm run test:website
```

### Success Output Contract
- Return created/updated file paths.
- Summarize validation commands and outcomes.
- Report assumptions made during generation.

### Failure Output Contract
- Report failing step and exact error output.
- Provide impacted files and rollback-safe next steps.
- Request user confirmation when risk or ambiguity blocks safe continuation.

## Self-Audit and Uncertainty Protocol (Mandatory)

For non-trivial tasks, complete this checklist before final output:

1. **Assumptions:** list non-obvious assumptions that influenced decisions.
2. **Risk Flags:** identify security, behavior, deployment, or data risks.
3. **Confidence:** report `high`, `medium`, or `low` with brief justification.
4. **Evidence:** cite changed files, executed commands, and validation outcomes.

Escalate to the user before continuing when security/auth/infra/destructive or major behavior-changing decisions are involved.

