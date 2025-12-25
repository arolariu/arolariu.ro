# RFC 1005: State Management with Zustand

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/src/stores/`, `src/stores/invoicesStore.tsx`, `src/stores/merchantsStore.tsx`

---

## Abstract

This RFC documents the client-side state management architecture for the arolariu.ro Next.js application using Zustand with IndexedDB persistence. The system provides type-safe, performant state management with offline-first capabilities, enabling seamless user experience across sessions and network conditions.

---

## 1. Motivation

### 1.1 Problem Statement

Modern web applications require sophisticated state management that:

1. **Persists Data Locally**: Support offline access and improve perceived performance
2. **Type Safety**: Prevent runtime errors through TypeScript integration
3. **Minimal Boilerplate**: Avoid verbose Redux-like patterns
4. **React 19 Compatibility**: Work seamlessly with Server Components and Suspense
5. **Developer Experience**: Provide debugging tools during development
6. **Performance**: Avoid unnecessary re-renders and memory overhead

### 1.2 Design Goals

- **Offline-First**: IndexedDB persistence for all domain entities
- **Type Safety**: Full TypeScript support with explicit state and action types
- **Minimal API**: Simple hook-based access with no providers needed
- **DevTools Integration**: Conditional Redux DevTools support in development
- **Entity-Level Storage**: Individual entities stored as separate rows for efficiency
- **Hydration Awareness**: Track when persisted data has been loaded

---

## 2. Technical Design

### 2.1 Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    React Components                             │
│                (Server & Client Components)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Zustand Stores                               │
│              (useInvoicesStore, useMerchantsStore)               │
├─────────────────────────────────────────────────────────────────┤
│  persist middleware                                              │
│  ├─ Serializes state to storage                                  │
│  ├─ Hydrates state on load                                       │
│  └─ Manages rehydration callbacks                                │
├─────────────────────────────────────────────────────────────────┤
│  devtools middleware (development only)                          │
│  └─ Redux DevTools integration                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                IndexedDB Storage Layer                           │
│                    (via Dexie.js)                                │
│  ┌───────────────────┐  ┌───────────────────┐                    │
│  │  invoices table   │  │  merchants table  │                    │
│  │  ├─ id (PK)       │  │  ├─ id (PK)       │                    │
│  │  └─ ...fields     │  │  └─ ...fields     │                    │
│  └───────────────────┘  └───────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Store Structure

Each Zustand store follows a consistent pattern with three layers:

```typescript
// 1. Persisted State Interface (stored in IndexedDB)
interface InvoicesPersistedState {
  invoices: ReadonlyArray<Invoice>;
}

// 2. In-Memory State Interface (extends persisted)
interface InvoicesState extends InvoicesPersistedState {
  selectedInvoices: Invoice[];  // Not persisted
  hasHydrated: boolean;         // Tracks hydration status
}

// 3. Actions Interface
interface InvoicesActions {
  setInvoices: (invoices: ReadonlyArray<Invoice>) => void;
  upsertInvoice: (invoice: Invoice) => void;
  removeInvoice: (invoiceId: string) => void;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  toggleInvoiceSelection: (invoice: Invoice) => void;
  clearSelectedInvoices: () => void;
  clearInvoices: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

// Combined Store Type
type InvoicesStore = InvoicesState & InvoicesActions;
```

#### 2.2.2 IndexedDB Storage Adapter

Custom storage adapter using Dexie.js for entity-level persistence:

```typescript
const indexedDBStorage = createIndexedDBStorage<InvoicesPersistedState, Invoice>({
  table: "invoices",
  entityKey: "invoices",
});
```

**Benefits**:
- **Entity-Level Storage**: Each invoice stored as individual IndexedDB row
- **Efficient Updates**: Only modified entities are written
- **Large Dataset Support**: IndexedDB handles thousands of records
- **Offline Support**: Data persists without network connectivity

#### 2.2.3 Middleware Configuration

```typescript
// Persist configuration
const persistConfig = {
  name: "invoices-store",
  storage: indexedDBStorage,
  partialize: (state: InvoicesStore): InvoicesPersistedState => ({
    invoices: [...state.invoices],
  }),
  onRehydrateStorage: () => (state: InvoicesStore | undefined) => {
    state?.setHasHydrated(true);
  },
};

// Environment-aware store creation
const createDevStore = () =>
  create<InvoicesStore>()(
    devtools(
      persist((set) => createInvoicesSlice(set), persistConfig),
      { name: "InvoicesStore", enabled: true }
    )
  );

const createProdStore = () =>
  create<InvoicesStore>()(
    persist((set) => createInvoicesSlice(set), persistConfig)
  );

export const useInvoicesStore =
  process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();
```

### 2.3 Store Inventory

| Store | Entity | Persisted Fields | In-Memory Fields |
|-------|--------|------------------|------------------|
| `useInvoicesStore` | Invoice | invoices[] | selectedInvoices[], hasHydrated |
| `useMerchantsStore` | Merchant | merchants[] | selectedMerchants[], hasHydrated |

---

## 3. Implementation Patterns

### 3.1 Using Stores in Client Components

```tsx
"use client";

import {useInvoicesStore} from "@/stores";

export function InvoicesList() {
  const {invoices, hasHydrated, upsertInvoice} = useInvoicesStore();

  // Wait for hydration before rendering
  if (!hasHydrated) {
    return <Loading />;
  }

  return (
    <ul>
      {invoices.map((invoice) => (
        <li key={invoice.id}>{invoice.name}</li>
      ))}
    </ul>
  );
}
```

### 3.2 Selective Subscriptions (Performance)

```tsx
"use client";

import {useInvoicesStore} from "@/stores";

export function InvoiceCount() {
  // Subscribe only to invoices.length, not the entire array
  const count = useInvoicesStore((state) => state.invoices.length);

  return <span>Total: {count}</span>;
}
```

### 3.3 Upsert Pattern (Avoid Duplicates)

```tsx
"use client";

export function useInvoiceSync() {
  const {upsertInvoice} = useInvoicesStore();

  const syncInvoice = async (invoiceId: string) => {
    const invoice = await fetchInvoiceFromAPI(invoiceId);
    // Upsert automatically handles create vs update
    upsertInvoice(invoice);
  };

  return {syncInvoice};
}
```

### 3.4 Hydration-Aware Server Components

```tsx
// Server Component fetches initial data
export default async function InvoicesPage() {
  const initialInvoices = await fetchInvoices();

  return (
    <Suspense fallback={<Loading />}>
      <InvoicesClient initialData={initialInvoices} />
    </Suspense>
  );
}

// Client Component hydrates store
"use client";

export function InvoicesClient({initialData}: {initialData: Invoice[]}) {
  const {invoices, setInvoices, hasHydrated} = useInvoicesStore();

  // Merge server data with persisted data on mount
  useEffect(() => {
    if (hasHydrated && initialData.length > 0) {
      // Server data takes precedence
      setInvoices(initialData);
    }
  }, [hasHydrated, initialData, setInvoices]);

  return <InvoicesList invoices={invoices} />;
}
```

---

## 4. Storage Architecture

### 4.1 IndexedDB Schema

```
Database: arolariu-store
├── Table: invoices
│   ├─ id: string (Primary Key)
│   ├─ name: string
│   ├─ merchantId: string
│   ├─ totalAmount: number
│   └─ ...Invoice fields
│
└── Table: merchants
    ├─ id: string (Primary Key)
    ├─ name: string
    └─ ...Merchant fields
```

### 4.2 Storage Lifecycle

1. **Initial Load**: Store created with empty state
2. **Hydration**: Dexie reads entities from IndexedDB
3. **State Update**: Action modifies in-memory state
4. **Persistence**: Middleware writes changes to IndexedDB
5. **Page Reload**: State restored from IndexedDB

---

## 5. Developer Experience

### 5.1 Redux DevTools Integration

Development builds include Redux DevTools support:

- **Time Travel**: Replay state changes
- **Action Logging**: See all dispatched actions
- **State Inspection**: Browse current state tree
- **Import/Export**: Share state snapshots

### 5.2 Type Safety

Full TypeScript support prevents common errors:

```typescript
// ✅ Type-safe - compiler enforces correct types
upsertInvoice({
  id: "123",
  name: "Invoice #123",
  totalAmount: 99.99,
  // ...required fields
});

// ❌ Compile error - missing required fields
upsertInvoice({id: "123"}); // Error: Missing properties
```

---

## 6. Trade-offs and Alternatives

### 6.1 Considered Alternatives

| Alternative | Reason for Rejection |
|-------------|---------------------|
| **Redux Toolkit** | More boilerplate, overkill for this use case |
| **React Context** | No persistence, prop drilling for large state |
| **localStorage** | 5MB limit, no structured queries |
| **React Query** | Server state focused, not for local persistence |
| **Jotai** | Atomic model less suitable for entity collections |

### 6.2 Trade-offs

**Pros**:
- ✅ Minimal boilerplate
- ✅ TypeScript-first design
- ✅ IndexedDB for large datasets
- ✅ No provider components needed
- ✅ DevTools in development only

**Cons**:
- ⚠️ IndexedDB async nature requires hydration handling
- ⚠️ Entity-level storage adds complexity
- ⚠️ No built-in optimistic updates (must be implemented)

---

## 7. Related Documentation

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Dexie.js Documentation](https://dexie.org/)
- [RFC 1001: OpenTelemetry](./1001-opentelemetry-observability-system.md) - For tracing store operations
- [RFC 1003: Internationalization](./1003-internationalization-system.md) - Locale-aware state handling

---

## 8. File Locations

| File | Purpose |
|------|---------|
| `src/stores/index.ts` | Barrel export for all stores |
| `src/stores/invoicesStore.tsx` | Invoices Zustand store |
| `src/stores/merchantsStore.tsx` | Merchants Zustand store |
| `src/stores/storage/indexedDBStorage.ts` | Custom IndexedDB adapter |
