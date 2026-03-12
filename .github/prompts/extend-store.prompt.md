---
mode: 'agent'
description: 'Add new state/actions to an existing Zustand store following RFC 1005 patterns'
---

# Extend Zustand Store

Add new state properties or actions to an existing Zustand store following RFC 1005 patterns.

## Context
- Stores location: `sites/arolariu.ro/src/stores/`
- Active stores: invoicesStore, merchantsStore, scansStore, preferencesStore
- All use IndexedDB persistence via Dexie + devtools middleware
- Factory: `createEntityStore.ts` for entity-pattern stores

## Steps

### 1. Identify the Store
- Determine which store needs the new state/action
- Read the current store file to understand its shape
- Check if `createEntityStore` factory can handle the change or if it needs hand-rolling

### 2. Update State Interface
```typescript
// Add to the persisted state interface (if data should survive refreshes)
interface PersistedState {
  existingField: Type;
  newField: NewType;  // ← Add here
}

// Or to in-memory state (if transient)
interface State extends PersistedState {
  newTransientField: Type;  // ← Not persisted
}
```

### 3. Add Actions
```typescript
interface Actions {
  setNewField: (value: NewType) => void;
}

// In store creation:
setNewField: (value) => set({ newField: value }),
```

### 4. Update Barrel Export
- Ensure new exports are in `src/stores/index.ts`

### 5. Update Tests
- Add tests in the corresponding `*.test.tsx` file
- Test the new state default value
- Test the new action behavior
- Test persistence (if persisted state)

### 6. Use `useShallow` for Object Selectors
```typescript
const { newField, setNewField } = useStore(
  useShallow((state) => ({
    newField: state.newField,
    setNewField: state.setNewField,
  })),
);
```

## Checklist
- [ ] State interface updated (persisted vs in-memory)
- [ ] Actions added with proper typing
- [ ] Barrel export updated if needed
- [ ] Tests cover new state and actions
- [ ] Uses `useShallow` for object selectors in components
