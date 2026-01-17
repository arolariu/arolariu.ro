# RFC 1007: Advanced Frontend Patterns

- **Status**: Implemented
- **Date**: 2026-01-15
- **Authors**: arolariu
- **Related Components**: `sites/arolariu.ro/src/stores/`, `sites/arolariu.ro/src/lib/actions/`, `sites/arolariu.ro/src/app/domains/invoices/_contexts/`

---

## Abstract

This RFC documents advanced frontend patterns implemented in the arolariu.ro Next.js application that go beyond basic React patterns. These patterns provide type-safe, reusable abstractions for common concerns: entity state management with persistence, type-safe server action results, and modal dialog state management. These patterns eliminate code duplication and enforce consistent behavior across the application.

---

## 1. Motivation

### 1.1 Problem Statement

As the application grew, several recurring patterns emerged that required standardization:

1. **Entity Store Duplication**: Multiple stores (invoices, merchants, scans) had nearly identical CRUD logic
2. **Server Action Error Handling**: Inconsistent error handling across server actions
3. **Dialog Management Complexity**: Modal dialogs needed mode/payload support beyond simple open/close

### 1.2 Design Goals

- **DRY Principle**: Eliminate code duplication through generic abstractions
- **Type Safety**: Leverage TypeScript generics for compile-time validation
- **Consistency**: Enforce uniform patterns across the codebase
- **Developer Experience**: Provide clear, well-documented APIs

---

## 2. Generic Entity Store Factory

### 2.1 Overview

The `createEntityStore<E>` factory function creates Zustand stores with IndexedDB persistence, eliminating boilerplate across entity types.

**Location**: `sites/arolariu.ro/src/stores/createEntityStore.ts`

### 2.2 Architecture

```text
+-------------------+     +------------------+     +---------------+
|   Component       | --> |  Entity Store    | --> |   IndexedDB   |
|   (useStore)      |     |  (Zustand)       |     |   (Dexie)     |
+-------------------+     +------------------+     +---------------+
                                  ^
                                  |
                          +---------------+
                          |  DevTools     |
                          |  (Dev only)   |
                          +---------------+
```

### 2.3 Core Types

```typescript
/**
 * Base entity interface requiring an id field.
 */
export interface BaseEntity {
  readonly id: string;
}

/**
 * Persisted state (saved to IndexedDB).
 */
export interface EntityPersistedState<E extends BaseEntity> {
  readonly entities: ReadonlyArray<E>;
}

/**
 * Full state including in-memory only fields.
 */
export interface EntityState<E extends BaseEntity> extends EntityPersistedState<E> {
  selectedEntities: E[];
  hasHydrated: boolean;
}

/**
 * Actions available on all entity stores.
 */
export interface EntityActions<E extends BaseEntity> {
  setEntities: (entities: ReadonlyArray<E>) => void;
  setSelectedEntities: (selectedEntities: E[]) => void;
  upsertEntity: (entity: E) => void;
  removeEntity: (entityId: string) => void;
  updateEntity: (entityId: string, updates: Partial<E>) => void;
  toggleEntitySelection: (entity: E) => void;
  clearSelectedEntities: () => void;
  clearEntities: () => void;
  getEntityById: (entityId: string) => E | undefined;
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Combined store type.
 */
export type EntityStore<E extends BaseEntity> = EntityState<E> & EntityActions<E>;
```

### 2.4 Usage Pattern

```typescript
// 1. Define entity type
interface Invoice extends BaseEntity {
  name: string;
  createdAt: Date;
  totalAmount: number;
}

// 2. Create store with configuration
export const useInvoicesStore = createEntityStore<Invoice>({
  tableName: "invoices",      // IndexedDB table name
  storeName: "InvoicesStore", // DevTools display name
  persistName: "invoices-store", // Persist middleware key
});

// 3. Use in components
function InvoicesList() {
  const {entities, upsertEntity, hasHydrated} = useInvoicesStore(
    useShallow((state) => ({
      entities: state.entities,
      upsertEntity: state.upsertEntity,
      hasHydrated: state.hasHydrated,
    }))
  );

  if (!hasHydrated) return <Loading />;

  return (
    <ul>
      {entities.map((invoice) => (
        <li key={invoice.id}>{invoice.name}</li>
      ))}
    </ul>
  );
}
```

### 2.5 Key Features

| Feature | Description |
|---------|-------------|
| **IndexedDB Persistence** | Entities survive page refresh via Dexie storage adapter |
| **Hydration Tracking** | `hasHydrated` flag prevents flash of empty content |
| **DevTools Integration** | Full Redux DevTools support in development |
| **Selection Management** | Built-in multi-select with toggle/clear |
| **Upsert Operation** | Single method handles both insert and update |
| **Partial Updates** | `updateEntity` accepts partial entity data |

### 2.6 Stores Using This Pattern

- `useInvoicesStore` - Invoice entities
- `useMerchantsStore` - Merchant entities
- `useScansStore` - Scan entities

---

## 3. Server Action Result Pattern

### 3.1 Overview

A discriminated union type that provides type-safe error handling for server actions, ensuring consistent error structures across the application.

**Location**: `sites/arolariu.ro/src/lib/utils.server.ts`

### 3.2 Type Definitions

```typescript
/**
 * Standardized error codes for server actions.
 */
export type ServerActionErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Discriminated union result type.
 * Either success with data, or failure with error details.
 */
export type ServerActionResult<T> =
  | {success: true; data: T}
  | {success: false; error: {code: ServerActionErrorCode; message: string; status?: number}};
```

### 3.3 Helper Functions

```typescript
/**
 * Maps HTTP status codes to error codes.
 */
export function mapHttpStatusToErrorCode(status: number): ServerActionErrorCode {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

/**
 * Creates error result from caught exception.
 */
export function createErrorResult<T>(error: unknown, defaultMessage: string): ServerActionResult<T> {
  if (error instanceof Error) {
    const isTimeout = error.message.includes("timed out");
    return {
      success: false,
      error: {
        code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
        message: error.message,
      },
    };
  }
  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: defaultMessage,
    },
  };
}
```

### 3.4 Server Action Pattern

```typescript
"use server";

import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";

type ServerActionOutputType = Promise<ServerActionResult<ReadonlyArray<Invoice>>>;

export default async function fetchInvoices(): ServerActionOutputType {
  return withSpan("api.actions.invoices.fetchInvoices", async () => {
    try {
      const {userJwt} = await fetchBFFUserFromAuthService();

      const response = await fetchWithTimeout(`${API_URL}/invoices/`, {
        headers: {Authorization: `Bearer ${userJwt}`},
      });

      if (response.ok) {
        const data = await response.json() as Invoice[];
        return {success: true, data};
      }

      return {
        success: false,
        error: {
          code: mapHttpStatusToErrorCode(response.status),
          message: `Failed to fetch invoices: ${response.statusText}`,
          status: response.status,
        },
      };
    } catch (error) {
      return createErrorResult<ReadonlyArray<Invoice>>(error, "Failed to fetch invoices");
    }
  });
}
```

### 3.5 Client-Side Consumption

```typescript
"use client";

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";

export function useInvoices() {
  const [isError, setIsError] = useState(false);
  const {entities, setEntities, hasHydrated} = useInvoicesStore(useShallow(...));

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchInvoices();

      if (result.success) {
        setEntities([...result.data]);
      } else {
        console.error(`[${result.error.code}] ${result.error.message}`);
        setIsError(true);
      }
    };
    fetchData();
  }, [setEntities]);

  return {invoices: entities, isLoading: !hasHydrated, isError};
}
```

### 3.6 Benefits

| Benefit | Description |
|---------|-------------|
| **Type-Safe Error Handling** | TypeScript narrows type after `result.success` check |
| **Consistent Error Structure** | All errors have code, message, and optional status |
| **Meaningful Error Codes** | Semantic codes enable proper UI error messaging |
| **OpenTelemetry Integration** | All actions wrapped in spans for tracing |
| **Timeout Protection** | 30-second default timeout prevents hanging requests |

---

## 4. Dialog Context with Mode and Payload

### 4.1 Overview

A context-based dialog management system that supports multiple dialog types with operation modes and data payloads, preventing multiple simultaneous dialogs.

**Location**: `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`

### 4.2 Type Definitions

```typescript
/**
 * Dialog type enumeration - exhaustive list of dialog identifiers.
 */
export type DialogType = Readonly<
  | "EDIT_INVOICE__ANALYSIS"
  | "EDIT_INVOICE__IMAGE"
  | "EDIT_INVOICE__SCAN"
  | "EDIT_INVOICE__MERCHANT"
  | "EDIT_INVOICE__MERCHANT_INVOICES"
  | "EDIT_INVOICE__RECIPE"
  | "EDIT_INVOICE__METADATA"
  | "EDIT_INVOICE__ITEMS"
  | "EDIT_INVOICE__FEEDBACK"
  | "VIEW_INVOICE__SHARE_ANALYTICS"
  | "VIEW_INVOICES__IMPORT"
  | "VIEW_INVOICES__EXPORT"
  | "SHARED__INVOICE_DELETE"
  | "SHARED__INVOICE_SHARE"
> | null;

/**
 * Operation mode for the dialog.
 */
export type DialogMode = Readonly<"view" | "add" | "edit" | "delete" | "share"> | null;

/**
 * Payload data for the dialog (entity ID, entity data, etc.).
 */
export type DialogPayload = unknown;

/**
 * Current dialog state structure.
 */
type DialogCurrent = {
  type: DialogType;
  mode: DialogMode;
  payload: DialogPayload;
};
```

### 4.3 Context API

```typescript
interface DialogContextValue {
  currentDialog: DialogCurrent;
  isOpen: (dialog: DialogType) => boolean;
  openDialog: (dialog: DialogType, mode?: DialogMode, payload?: DialogPayload) => void;
  closeDialog: () => void;
}
```

### 4.4 Provider Implementation

```typescript
export function DialogProvider({children}: {children: ReactNode}) {
  const [dialogState, setDialogState] = useState<DialogCurrent>({
    type: null,
    mode: null,
    payload: null,
  });

  const currentDialog = useRef<DialogCurrent>({
    type: null,
    mode: null,
    payload: null,
  });

  const isOpen = useCallback(
    (dialog: DialogType) => currentDialog.current.type === dialog,
    []
  );

  const openDialog = useCallback(
    (dialog: DialogType, mode: DialogMode = "view", payload: DialogPayload = null) => {
      // Only open if no dialog is currently open (prevents stacking)
      if (currentDialog.current.type === null) {
        currentDialog.current = {type: dialog, mode, payload};
        setDialogState(currentDialog.current);
      }
    },
    []
  );

  const closeDialog = useCallback(() => {
    currentDialog.current = {type: null, mode: null, payload: null};
    setDialogState(currentDialog.current);
  }, []);

  const value = useMemo(
    () => ({currentDialog: currentDialog.current, isOpen, openDialog, closeDialog}),
    [dialogState] // Re-create when state changes
  );

  return <DialogContext value={value}>{children}</DialogContext>;
}
```

### 4.5 Usage Pattern

```typescript
// 1. Wrap components with provider
<DialogProvider>
  <InvoiceEditor />
  <DialogContainer />
</DialogProvider>

// 2. Use in components
function InvoiceEditor() {
  const {openDialog} = useDialogs();

  return (
    <Button onClick={() => openDialog("EDIT_INVOICE__MERCHANT", "edit", {merchantId: "123"})}>
      Edit Merchant
    </Button>
  );
}

// 3. Render dialogs conditionally
function DialogContainer() {
  const {currentDialog, closeDialog} = useDialogs();

  if (currentDialog.type === "EDIT_INVOICE__MERCHANT") {
    return (
      <MerchantDialog
        mode={currentDialog.mode}
        merchantId={currentDialog.payload?.merchantId}
        onClose={closeDialog}
      />
    );
  }

  return null;
}
```

### 4.6 Key Features

| Feature | Description |
|---------|-------------|
| **Single Dialog Constraint** | `openDialog` no-ops if dialog already open |
| **Mode-Aware Dialogs** | Same dialog can behave differently in view/edit/delete modes |
| **Payload Support** | Pass entity IDs, data, or configuration to dialogs |
| **Ref + State Hybrid** | Ref for immediate reads, state for React re-renders |
| **Memoized Context** | Prevents unnecessary re-renders of consuming components |

---

## 5. Integration Example

### 5.1 Complete Flow: Edit Invoice Merchant

```typescript
// 1. User clicks edit merchant button
const {openDialog} = useDialogs();
openDialog("EDIT_INVOICE__MERCHANT", "edit", {invoiceId: invoice.id});

// 2. DialogContainer renders MerchantEditDialog
function MerchantEditDialog({mode, payload, onClose}) {
  const {entities: merchants} = useMerchantsStore(useShallow(...));

  const handleSave = async (merchantData) => {
    const result = await updateMerchant(merchantData);

    if (result.success) {
      // Update local store immediately
      upsertMerchant(result.data);
      onClose();
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <MerchantForm onSubmit={handleSave} />
      </DialogContent>
    </Dialog>
  );
}

// 3. Server action handles the update
async function updateMerchant(data): ServerActionOutputType {
  // Returns ServerActionResult<Merchant>
}

// 4. Store updates and UI re-renders
```

---

## 6. Testing Strategies

### 6.1 Entity Store Testing

```typescript
import {renderHook, act} from "@testing-library/react";
import {useInvoicesStore} from "./invoicesStore";

describe("useInvoicesStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useInvoicesStore.getState().clearEntities();
  });

  it("upserts new entity", () => {
    const {result} = renderHook(() => useInvoicesStore());

    act(() => {
      result.current.upsertEntity({id: "1", name: "Test"});
    });

    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0].name).toBe("Test");
  });

  it("updates existing entity", () => {
    const {result} = renderHook(() => useInvoicesStore());

    act(() => {
      result.current.upsertEntity({id: "1", name: "Original"});
      result.current.upsertEntity({id: "1", name: "Updated"});
    });

    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0].name).toBe("Updated");
  });
});
```

### 6.2 Server Action Testing

```typescript
import fetchInvoices from "./fetchInvoices";

describe("fetchInvoices", () => {
  it("returns success result on 200", async () => {
    // Mock fetch to return success
    const result = await fetchInvoices();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });

  it("returns error result on 401", async () => {
    // Mock fetch to return 401
    const result = await fetchInvoices();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTH_ERROR");
    }
  });
});
```

### 6.3 Dialog Context Testing

```typescript
import {renderHook, act} from "@testing-library/react";
import {DialogProvider, useDialogs} from "./DialogContext";

describe("DialogContext", () => {
  const wrapper = ({children}) => <DialogProvider>{children}</DialogProvider>;

  it("opens dialog with mode and payload", () => {
    const {result} = renderHook(() => useDialogs(), {wrapper});

    act(() => {
      result.current.openDialog("EDIT_INVOICE__MERCHANT", "edit", {id: "123"});
    });

    expect(result.current.currentDialog.type).toBe("EDIT_INVOICE__MERCHANT");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toEqual({id: "123"});
  });

  it("prevents opening second dialog", () => {
    const {result} = renderHook(() => useDialogs(), {wrapper});

    act(() => {
      result.current.openDialog("EDIT_INVOICE__MERCHANT", "edit");
      result.current.openDialog("EDIT_INVOICE__IMAGE", "view"); // Should no-op
    });

    expect(result.current.currentDialog.type).toBe("EDIT_INVOICE__MERCHANT");
  });
});
```

---

## 7. Best Practices

### 7.1 Entity Store Usage

- **Do** use `useShallow` to prevent unnecessary re-renders
- **Do** check `hasHydrated` before displaying content
- **Do** use `upsertEntity` instead of manual add/update logic
- **Don't** store derived data - compute it in components

### 7.2 Server Actions

- **Do** wrap all API calls in OpenTelemetry spans
- **Do** use `fetchWithTimeout` for resilience
- **Do** map HTTP status codes to semantic error codes
- **Don't** throw exceptions - return error results

### 7.3 Dialog Management

- **Do** use semantic dialog type names (feature__action format)
- **Do** pass minimal payload (IDs over full objects)
- **Do** centralize dialog rendering in `DialogContainer`
- **Don't** open dialogs from within dialogs

---

## 8. References

### 8.1 Related RFCs

- **RFC 1005**: State Management (Zustand) - Foundation for entity stores
- **RFC 1001**: Frontend OpenTelemetry - Tracing integration

### 8.2 External Documentation

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Dexie.js Documentation](https://dexie.org/)
- [React Context Best Practices](https://react.dev/reference/react/useContext)

### 8.3 Internal Resources

- Entity Store Factory: `sites/arolariu.ro/src/stores/createEntityStore.ts`
- Server Utilities: `sites/arolariu.ro/src/lib/utils.server.ts`
- Dialog Context: `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`

---

## 9. Conclusion

These advanced patterns provide the foundation for scalable, maintainable frontend code:

- **Generic Entity Store Factory**: Eliminates ~80% of boilerplate for new entity types
- **Server Action Result Pattern**: Ensures type-safe, consistent error handling
- **Dialog Context with Mode/Payload**: Enables complex modal workflows

These patterns are production-tested across the invoices, merchants, and scans domains, demonstrating their reliability and flexibility.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-15
**Status**: Implemented
