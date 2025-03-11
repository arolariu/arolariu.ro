/** @format */

import {act, renderHook} from "@testing-library/react";
import {usePaginationItems} from "./usePagination";

describe("usePaginationItems hook", () => {
  const mockItems = [
    {id: 1, name: "Item 1"},
    {id: 2, name: "Item 2"},
    {id: 3, name: "Item 3"},
    {id: 4, name: "Item 4"},
    {id: 5, name: "Item 5"},
    {id: 6, name: "Item 6"},
    {id: 7, name: "Item 7"},
    {id: 8, name: "Item 8"},
    {id: 9, name: "Item 9"},
    {id: 10, name: "Item 10"},
  ];

  it("should initialize with default values", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems}));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
  });

  it("should initialize with custom initial values", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems, initialPageSize: 3, initialPage: 2}));

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(3);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 4, name: "Item 4"});
  });

  it("should change page correctly", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems}));

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 6, name: "Item 6"});
  });

  it("should change page size correctly", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems}));

    act(() => {
      result.current.setPageSize(3);
    });

    expect(result.current.pageSize).toBe(3);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.paginatedItems).toHaveLength(3);
  });

  it("should filter items based on search query", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems, searchQuery: "Item 1"}));

    // Should match "Item 1" and "Item 10"
    expect(result.current.paginatedItems).toHaveLength(2);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 10, name: "Item 10"});
  });

  it("should reset to page 1 when search query changes", () => {
    const {result, rerender} = renderHook(({search}) => usePaginationItems({items: mockItems, searchQuery: search}), {
      initialProps: {search: ""},
    });

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Change search query
    rerender({search: "Item 1"});

    // Should reset to page 1
    expect(result.current.currentPage).toBe(1);
  });

  it("should adjust current page when it exceeds total pages", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems, initialPageSize: 3, initialPage: 4}));

    expect(result.current.currentPage).toBe(4);

    // Reduce items to make total pages less than current page
    const {result: newResult} = renderHook(() => usePaginationItems({items: mockItems.slice(0, 3), initialPageSize: 3, initialPage: 4}));

    expect(newResult.current.currentPage).toBe(1);
  });

  it("should reset pagination correctly", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems, initialPageSize: 3, initialPage: 1}));

    act(() => {
      result.current.setCurrentPage(3);
      result.current.setPageSize(2);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(2);

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(3);
  });

  it("should paginate custom items array", () => {
    const {result} = renderHook(() => usePaginationItems({items: mockItems, initialPageSize: 3}));

    const customItems = ["a", "b", "c", "d", "e", "f"];
    const paginatedCustomItems = result.current.paginate(customItems);

    expect(paginatedCustomItems).toEqual(["a", "b", "c"]);

    act(() => {
      result.current.setCurrentPage(2);
    });

    const paginatedCustomItems2 = result.current.paginate(customItems);
    expect(paginatedCustomItems2).toEqual(["d", "e", "f"]);
  });
});
