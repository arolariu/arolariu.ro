/**
 * @fileoverview Regression tests for the TableView component.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/tables/TableView.test
 *
 * @remarks
 * The primary test here pins React's Rules-of-Hooks invariant for TableView:
 * the component must call the SAME number of hooks regardless of whether the
 * `invoices` prop is non-empty or empty. A previous regression placed a
 * `useCallback` (`handleSortKeyDown`) AFTER the empty-state early return, so
 * re-rendering with a stale-then-empty invoices list (i.e. IndexedDB-cached
 * Zustand state followed by a server fetch returning `[]`) caused React to
 * throw "Rendered fewer hooks than expected".
 *
 * The transition tested here mirrors the real user flow from the bug report:
 * 1. island.tsx hydrates from IndexedDB → invoices=[1 stale invoice]
 * 2. TableView renders with the full hook set (including handleSortKeyDown)
 * 3. fetchInvoices server action returns [] → setInvoices([])
 * 4. TableView re-renders with invoices=[] → must still call every hook
 */

import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import {render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// `useInvoicesStore` is consumed via `@/stores`. We replace it with a thin
// selector-aware stub so the component can read its two slices
// (selectedEntities, setSelectedEntities) without booting the real IndexedDB
// persistence layer.
const {mockUseInvoicesStore, mockSetSelectedEntities} = vi.hoisted(() => ({
  mockUseInvoicesStore: vi.fn(),
  mockSetSelectedEntities: vi.fn(),
}));

vi.mock("@/stores", () => ({
  useInvoicesStore: mockUseInvoicesStore,
}));

// TableViewActions (rendered inside non-empty rows) consumes useDialog.
// Replace the whole context module so we don't need to wrap in DialogProvider;
// the dialog plumbing is irrelevant to the hook-order invariant we're pinning.
vi.mock("../../../_contexts/DialogContext", () => ({
  useDialog: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    payload: undefined,
    mode: null,
  }),
}));

// Avoid pulling next/link's full router runtime — render its children directly.
vi.mock("next/link", () => ({
  default: ({children}: {children: React.ReactNode}) => children,
}));

import {TableView} from "./TableView";

describe("TableView (regression)", () => {
  const noop = () => {};

  beforeEach(() => {
    mockUseInvoicesStore.mockImplementation(
      (selector: (state: {selectedEntities: Invoice[]; setSelectedEntities: typeof mockSetSelectedEntities}) => unknown) =>
        selector({
          selectedEntities: [],
          setSelectedEntities: mockSetSelectedEntities,
        }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    pageSize: 20,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: noop,
    handleNextPage: noop,
    handlePageSizeChange: noop,
    sortBy: null as null | "date" | "amount" | "name",
    sortDirection: null as null | "asc" | "desc",
    onSort: noop,
  };

  it("does not violate Rules of Hooks when re-rendering from non-empty to empty", () => {
    const stale = new InvoiceBuilder().withName("Stale Invoice").build();

    // First render: non-empty list mirrors the stale-from-IndexedDB hydration.
    const {rerender, queryByText} = render(
      <TableView
        invoices={[stale]}
        {...baseProps}
      />,
    );
    expect(queryByText(stale.name)).not.toBeNull();

    // Re-render with the empty list (server returned []). Before the fix, this
    // throws "Rendered fewer hooks than expected" because handleSortKeyDown
    // sat below the `invoices.length === 0` early return. After the fix, the
    // EmptyState renders cleanly.
    expect(() =>
      rerender(
        <TableView
          invoices={[]}
          {...baseProps}
        />,
      ),
    ).not.toThrow();

    // EmptyState surfaces the translation key for the table-view empty title.
    // Our next-intl mock returns "namespace.key", so the resolved string is
    // "IMS--List.tableView.empty.title".
    expect(queryByText("IMS--List.tableView.empty.title")).not.toBeNull();
  });

  it("renders the EmptyState on a fresh empty-list render", () => {
    const {queryByText} = render(
      <TableView
        invoices={[]}
        {...baseProps}
      />,
    );

    expect(queryByText("IMS--List.tableView.empty.title")).not.toBeNull();
  });
});
