---
uid: arolariu.Frontend.Hooks.usePaginationWithSearch
title: usePaginationWithSearch
---

# usePaginationWithSearch

Client-side pagination + lightweight text search filter for arbitrary item arrays.
Resets the visible page to 1 whenever a non-empty `searchQuery` is applied, without mutating the caller's data.

## Signature

```ts
function usePaginationWithSearch<T>(params: {
  items: T[];
  initialPageSize?: number;
  initialPage?: number;
  searchQuery?: string;
}): Readonly<{
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  paginatedItems: T[];
  paginate: <U = T>(items: U[]) => U[];
  resetPagination: () => void;
}>;
```

## Type Parameters

| Name | Description |
| ---- | ----------- |
| `T` | Element type of the incoming `items` collection. |

## Parameters

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `items` | `T[]` | — | Full source collection to filter & page. |
| `initialPageSize` | `number` | `5` | Starting page size; mutable via `setPageSize`. |
| `initialPage` | `number` | `1` | Starting page (1-based) before any clamping/search effects. |
| `searchQuery` | `string \| undefined` | `undefined` | Optional search text; triggers filtering + page reset. |

## Returned Object

| Field | Type | Description |
| ----- | ---- | ----------- |
| `currentPage` | `number` | Effective, clamped page (always 1 if `searchQuery` non-empty). |
| `setCurrentPage` | `(page: number) => void` | Request a new page (will be clamped). |
| `pageSize` | `number` | Current page size. |
| `setPageSize` | `(size: number) => void` | Update page size (recomputes pagination). |
| `totalPages` | `number` | Derived from filtered item length & page size (≥ 1). |
| `paginatedItems` | `T[]` | Slice of filtered data for `currentPage`. |
| `paginate` | `<U = T>(items: U[]) => U[]` | Utility allowing paging over an alternate list with same pagination state. |
| `resetPagination` | `() => void` | Restores `requestedPage` & `pageSize` to initial values. |

## Behavior Notes

- Search filter: Converts each item via `JSON.stringify(item)` (try/catch guarded) then substring matches (case-insensitive).
- Page reset: Active search forces `currentPage = 1` (derived, not state mutation).
- Clamping: Requested page always mapped into `[1, totalPages]`.
- Purity: No effects for pagination math; uses `useMemo` & `useCallback`.
- Performance: For very large lists, consider pre-indexing or limiting stringify cost.

## Examples

### Basic Usage

```tsx
const {
  paginatedItems,
  currentPage,
  totalPages,
  setCurrentPage,
  pageSize,
  setPageSize,
} = usePaginationWithSearch({
  items: invoices,
  initialPageSize: 10,
  searchQuery,
});
```

### Rendering Page Controls

```tsx
function Pager({ items }: { items: Invoice[] }) {
  const { paginatedItems, currentPage, totalPages, setCurrentPage } =
    usePaginationWithSearch({ items, initialPageSize: 15, searchQuery: "" });

  return (
    <>
      <ul>
        {paginatedItems.map(inv => <li key={inv.id}>{inv.id}</li>)}
      </ul>
      <div>
        <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
          Prev
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </>
  );
}
```

### Custom Filtering + External List

Use the exposed `paginate` helper to reuse the same paging state for a separately transformed list:

```tsx
const {
  paginate,
  currentPage,
  totalPages
} = usePaginationWithSearch({ items, searchQuery });

const highValueItems = useMemo(
  () => items.filter(i => i.amount > 1000),
  [items]
);

const visibleHighValue = paginate(highValueItems);
```

## Edge Cases

| Situation | Outcome |
| --------- | ------- |
| `items` empty | `totalPages = 1`, `paginatedItems = []`. |
| `searchQuery` blanks / whitespace | Treated as no search (trim applied). |
| Page requested beyond range | Clamped to `totalPages`. |
| Negative page requested | Clamped to `1`. |

## Performance Considerations

- `JSON.stringify` per item can be O(n * size(item)). For very large collections consider:
  - Precomputing a normalized search field.
  - Debouncing search input before passing `searchQuery`.
- Avoid passing unstable `items` references each render (memoize upstream if possible).

## Related

- <xref:arolariu.Frontend.Hooks.useWindowSize>
- <xref:arolariu.Frontend.Hooks.useZustandStore>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial hook documentation. | Alexandru-Razvan Olariu |
