---
uid: arolariu.Frontend.Hooks
title: Frontend Hooks
---

# arolariu.Frontend.Hooks

Collection of reusable React hooks powering the `arolariu.ro` frontend.
They encapsulate UI state, provide cross-cutting behavior (pagination, viewport sizing), or expose app-level state (Zustand store).

| Hook | UID | Purpose | Key Return Fields |
| ---- | --- | ------- | ----------------- |
| `usePaginationWithSearch` | `arolariu.Frontend.Hooks.usePaginationWithSearch` | Client-side pagination with search-driven automatic page reset | `paginatedItems`, `currentPage`, `totalPages`, `paginate()` |
| `useWindowSize` | `arolariu.Frontend.Hooks.useWindowSize` | Track viewport dimensions + convenience booleans | `windowSize`, `isMobile`, `isDesktop` |
| `useZustandStore` | `arolariu.Frontend.Hooks.useZustandStore` | Read/write global persisted state (invoices, merchants, selections) | `invoices`, `selectedInvoices`, action setters |

## Usage Philosophy

- Hooks are “pure UI utilities”: no implicit DOM mutations beyond needed listeners.
- Prefer derived values via `useMemo` over additional state.
- Keep side effects localized (e.g., event listeners in `useEffect` with proper cleanup).
- Expose stable function references (memoization) where consumption frequency is high.

## Import Paths (Examples)

```ts
import { usePaginationWithSearch, useWindowSize } from "@/hooks";
import { useZustandStore } from "@/hooks/stateStore"; // direct for store until re-exported consistently
```

## Cross-References

- Global store actions documented in: <xref:arolariu.Frontend.Hooks.useZustandStore>
- Utilities consumed by hooks (e.g., formatting) in: <xref:arolariu.Frontend.Utils>

## Hooks Covered

See individual pages:
- <xref:arolariu.Frontend.Hooks.usePaginationWithSearch>
- <xref:arolariu.Frontend.Hooks.useWindowSize>
- <xref:arolariu.Frontend.Hooks.useZustandStore>

## Example Composition

```tsx
function InvoicesList({ items }: { items: any[] }) {
  const { paginatedItems, currentPage, totalPages, setCurrentPage } =
    usePaginationWithSearch({ items, initialPageSize: 10 });

  const { isMobile } = useWindowSize();

  return (
    <div>
      <ul>
        {paginatedItems.map((inv) => (
          <li key={inv.id}>{inv.id}</li>
        ))}
      </ul>
      <nav>
        Page {currentPage} / {totalPages}
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </nav>
      {isMobile && <p>Compact layout active.</p>}
    </div>
  );
}
```

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial hook overview page. | Alexandru-Razvan Olariu |
