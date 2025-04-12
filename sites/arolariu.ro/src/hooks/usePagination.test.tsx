/** @format */

import {act, renderHook} from "@testing-library/react";
import {usePaginationWithSearch} from "./usePagination";

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
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems}));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
  });

  it("should initialize with custom initial values", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, initialPageSize: 3, initialPage: 2}));

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(3);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 4, name: "Item 4"});
  });

  it("should change page correctly", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems}));

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 6, name: "Item 6"});
  });

  it("should change page size correctly", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems}));

    act(() => {
      result.current.setPageSize(3);
    });

    expect(result.current.pageSize).toBe(3);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.paginatedItems).toHaveLength(3);
  });

  it("should filter items based on search query", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: "Item 1"}));

    // Should match "Item 1" and "Item 10"
    expect(result.current.paginatedItems).toHaveLength(2);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 10, name: "Item 10"});
  });

  it("should reset to page 1 when search query changes", () => {
    const {result, rerender} = renderHook(({search}) => usePaginationWithSearch({items: mockItems, searchQuery: search}), {
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
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, initialPageSize: 3, initialPage: 4}));

    expect(result.current.currentPage).toBe(4);

    // Reduce items to make total pages less than current page
    const {result: newResult} = renderHook(() =>
      usePaginationWithSearch({items: mockItems.slice(0, 3), initialPageSize: 3, initialPage: 4}),
    );

    expect(newResult.current.currentPage).toBe(1);
  });

  it("should reset pagination correctly", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, initialPageSize: 3, initialPage: 1}));

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
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, initialPageSize: 3}));

    const customItems = ["a", "b", "c", "d", "e", "f"];
    const paginatedCustomItems = result.current.paginate(customItems);

    expect(paginatedCustomItems).toEqual(["a", "b", "c"]);

    act(() => {
      result.current.setCurrentPage(2);
    });

    const paginatedCustomItems2 = result.current.paginate(customItems);
    expect(paginatedCustomItems2).toEqual(["d", "e", "f"]);
  });

  it("should handle empty items array", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: []}));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it("should handle items with different structures", () => {
    const mixedItems = [
      {id: 1, name: "Item 1"},
      {id: 2, description: "Item 2"},
      {id: 3, title: "Item 3"},
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: mixedItems}));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(3);
  });

  it("should handle invalid search query", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: "Invalid Item"}));

    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it("should handle search query with special characters", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: "Item 1!"}));

    expect(result.current.paginatedItems).toHaveLength(0);
  });

  it("should handle search query with empty string", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: ""}));

    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
  });

  it("should handle search query with only spaces", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: "   "}));

    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
  });

  it("should correctly handle search query with mixed case", () => {
    const {result} = renderHook(() => usePaginationWithSearch({items: mockItems, searchQuery: "item 1"}));

    expect(result.current.paginatedItems).toHaveLength(2);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 10, name: "Item 10"});
  });

  it("should not re-render unnecessarily when search query is the same", () => {
    const {result, rerender} = renderHook(({search}) => usePaginationWithSearch({items: mockItems, searchQuery: search}), {
      initialProps: {search: "Item 1"},
    });

    const initialRenderCount = result.current.paginatedItems.length;

    rerender({search: "Item 1"});

    expect(result.current.paginatedItems.length).toBe(initialRenderCount);
  });

  it("should handle invalid items gracefully", () => {
    const invalidItems = [
      {id: 1, name: "Item 1"},
      {id: 2, name: null}, // Invalid item
      {id: 3, name: "Item 3"},
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: invalidItems}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: null});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: "Item 3"});
  });

  it("should handle items with missing properties", () => {
    const itemsWithMissingProps = [
      {id: 1, name: "Item 1"},
      {id: 2}, // Missing name property
      {id: 3, name: "Item 3"},
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: itemsWithMissingProps}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: "Item 3"});
  });

  it("should handle items with null or undefined values", () => {
    const itemsWithNullValues = [
      {id: 1, name: "Item 1"},
      {id: 2, name: undefined}, // Undefined value
      {id: 3, name: null}, // Null value
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: itemsWithNullValues}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: undefined});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: null});
  });

  it("should handle items with empty strings", () => {
    const itemsWithEmptyStrings = [
      {id: 1, name: "Item 1"},
      {id: 2, name: ""}, // Empty string
      {id: 3, name: "Item 3"},
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: itemsWithEmptyStrings}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: ""});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: "Item 3"});
  });

  it("should handle items with special characters", () => {
    const itemsWithSpecialChars = [
      {id: 1, name: "Item 1!"},
      {id: 2, name: "Item @2"},
      {id: 3, name: "#Item 3"},
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: itemsWithSpecialChars}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1!"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: "Item @2"});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: "#Item 3"});
  });

  it("should handle items with mixed types", () => {
    const mixedTypeItems = [
      {id: 1, name: "Item 1"},
      {id: 2, name: 123}, // Number instead of string
      {id: 3, name: true}, // Boolean instead of string
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: mixedTypeItems}));

    expect(result.current.paginatedItems).toHaveLength(3);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: 123});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: true});
  });

  it("should handle items with missing IDs", () => {
    const itemsWithMissingIDs = [
      {name: "Item 1"}, // Missing ID
      {id: 2, name: "Item 2"},
      {id: 3}, // Missing name
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: itemsWithMissingIDs}));

    expect(result.current.paginatedItems).toHaveLength(3);

    expect(result.current.paginatedItems[0]).toEqual({name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: "Item 2"});
    expect(result.current.paginatedItems[2]).toEqual({id: 3});
  });

  it("should handle items with different data types", () => {
    const mixedTypeItems = [
      {id: 1, name: "Item 1"},
      {id: 2, name: 123}, // Number
      {id: 3, name: true}, // Boolean
      {id: 4, name: null}, // Null
      {id: 5, name: undefined}, // Undefined
    ];

    const {result} = renderHook(() => usePaginationWithSearch({items: mixedTypeItems}));

    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0]).toEqual({id: 1, name: "Item 1"});
    expect(result.current.paginatedItems[1]).toEqual({id: 2, name: 123});
    expect(result.current.paginatedItems[2]).toEqual({id: 3, name: true});
    expect(result.current.paginatedItems[3]).toEqual({id: 4, name: null});
    expect(result.current.paginatedItems[4]).toEqual({id: 5, name: undefined});
  });
});
