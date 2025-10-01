---
uid: arolariu.Frontend.Hooks.useZustandStore
title: useZustandStore
---

# useZustandStore

Global application state container (Zustand) exposing invoice & merchant collections plus selection state.
Automatically selects storage & middleware based on `NODE_ENV`:
- Development: sessionStorage + devtools.
- Production: localStorage (persist only).

## State Shape

```ts
type StoreState = {
  invoices: Invoice[];
  selectedInvoices: Invoice[];
  merchants: Merchant[];
};

type StoreActions = {
  setInvoices(invoices: Invoice[]): void;
  setSelectedInvoices(selectedInvoices: Invoice[]): void;
  setMerchants(merchants: Merchant[]): void;
};

type UseZustandStore = StoreState & StoreActions;
```

## Signature

```ts
const useZustandStore: () => UseZustandStore;
```

Invoke the hook inside React components to read or mutate state:

```tsx
const invoices = useZustandStore(s => s.invoices);
const setInvoices = useZustandStore(s => s.setInvoices);
```

## Environment-Specific Behavior

| Environment | Storage Backend | Extra Middleware |
| ----------- | ---------------- | ---------------- |
| Development (`NODE_ENV !== "production"`) | `sessionStorage` | `devtools` + `persist` |
| Production (`NODE_ENV === "production"`) | `localStorage` | `persist` only |

Persistence keys:
- Dev: `zustand-store-dev`
- Prod: `zustand-store-prd`

## Actions

| Action | Parameters | Effect |
| ------ | ---------- | ------ |
| `setInvoices` | `Invoice[]` | Replaces full invoices array. |
| `setSelectedInvoices` | `Invoice[]` | Replaces selection subset (e.g., multi-select UI). |
| `setMerchants` | `Merchant[]` | Replaces merchant registry. |

All setters shallow-copy into new state (object spread) for predictable change detection.

## Usage Examples

### Basic Read / Write

```tsx
function InvoicesPanel() {
  const { invoices, setInvoices } = useZustandStore();

  useEffect(() => {
    // Assume fetchInvoices returns Promise<Invoice[]>
    fetchInvoices("auth-token").then(data => setInvoices(data));
  }, [setInvoices]);

  return <p>Total invoices: {invoices.length}</p>;
}
```

### Selector + Equality Optimization

Prefer selectors to avoid unnecessary re-renders:

```tsx
import { shallow } from "zustand/shallow";

const { selectedInvoices, setSelectedInvoices } = useZustandStore(
  s => ({ selectedInvoices: s.selectedInvoices, setSelectedInvoices: s.setSelectedInvoices }),
  shallow
);
```

### Derived UI

```tsx
const invoiceCount = useZustandStore(s => s.invoices.length);
```

## Patterns & Recommendations

- Normalize or index heavy datasets upstream if frequent lookups occur.
- Keep store focused on cross-component shared state; local ephemeral UI state (open/closed, hover) stays in component hooks.
- Co-locate complex computed selectors outside components for reuse.

## Testing Tips

- For deterministic tests, mock storage (e.g., using `@testing-library/react` + JSDOM) before loading the store module.
- You can reset state by invoking each setter with initial values (or by clearing storage keys then reloading modules).

## Pitfalls

| Issue | Mitigation |
| ----- | ---------- |
| Large arrays causing frequent re-renders | Use granular selectors (`s => s.invoices.length`) instead of whole arrays when possible. |
| Persisted stale schema after shape change | Bump storage key names (`zustand-store-dev/prd`) when breaking changes occur. |
| Mixed environment detection (edge runtimes) | Ensure `NODE_ENV` is set consistently in build/deploy pipeline. |

## Related

- <xref:arolariu.Frontend.Hooks.usePaginationWithSearch>
- <xref:arolariu.Frontend.Hooks.useWindowSize>
- Utility functions (formatting, GUIDs) under <xref:arolariu.Frontend.Utils>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial documentation. | Alexandru-Razvan Olariu |
