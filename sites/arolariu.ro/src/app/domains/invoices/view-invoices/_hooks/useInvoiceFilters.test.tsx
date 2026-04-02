/**
 * @vitest-environment happy-dom
 */

import {renderHook} from "@testing-library/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoiceFilters} from "./useInvoiceFilters";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe("useInvoiceFilters", () => {
  const mockReplace = vi.fn();
  const mockPathname = "/domains/invoices/view-invoices";

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      replace: mockReplace,
    });
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);
  });

  describe("filters", () => {
    it("should return default filter state when no URL params are present", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters).toEqual({
        search: "",
        dateFrom: null,
        dateTo: null,
        amountMin: null,
        amountMax: null,
        categories: [],
        paymentTypes: [],
        sortBy: "date-desc",
        view: "table",
      });
    });

    it("should parse search query from URL param 'q'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=groceries");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.search).toBe("groceries");
    });

    it("should parse date range from URL params 'from' and 'to'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?from=2026-01-01&to=2026-03-28");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.dateFrom).toBe("2026-01-01");
      expect(result.current.filters.dateTo).toBe("2026-03-28");
    });

    it("should parse amount range from URL params 'min' and 'max'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?min=10&max=100");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.amountMin).toBe(10);
      expect(result.current.filters.amountMax).toBe(100);
    });

    it("should parse comma-separated categories from URL param 'cat'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?cat=100,200,300");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.categories).toEqual([100, 200, 300]);
    });

    it("should parse comma-separated payment types from URL param 'pay'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?pay=200,300");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.paymentTypes).toEqual([200, 300]);
    });

    it("should parse sort option from URL param 'sort'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?sort=amount-desc");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.sortBy).toBe("amount-desc");
    });

    it("should parse view mode from URL param 'view'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?view=grid");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.view).toBe("grid");
    });

    it("should filter out invalid numbers from category array", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?cat=100,invalid,200");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.categories).toEqual([100, 200]);
    });
  });

  describe("setFilters", () => {
    it("should update URL with new search query", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({search: "test query"});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?q=test+query`, {scroll: false});
    });

    it("should update URL with date range", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({dateFrom: "2026-01-01", dateTo: "2026-03-28"});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?from=2026-01-01&to=2026-03-28`, {scroll: false});
    });

    it("should update URL with amount range", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({amountMin: 10, amountMax: 100});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?min=10&max=100`, {scroll: false});
    });

    it("should update URL with categories", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({categories: [100, 200]});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?cat=100%2C200`, {scroll: false});
    });

    it("should remove param from URL when value is empty/null", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=test&min=10");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({search: "", amountMin: null});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(mockPathname, {scroll: false});
    });

    it("should not include default sort value in URL", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({sortBy: "date-desc"});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(mockPathname, {scroll: false});
    });

    it("should not include default view mode in URL", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({view: "table"});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(mockPathname, {scroll: false});
    });

    it("should set payment types query param", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set payment types to [100, 200] (Cash and Card)
      result.current.setFilters({paymentTypes: [100, 200]});

      // Assert - Verify URL includes 'pay' param
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?pay=100%2C200`, {scroll: false});
    });

    it("should set sort query param", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set sort to non-default value
      result.current.setFilters({sortBy: "amount-desc"});

      // Assert - Verify URL includes 'sort' param
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?sort=amount-desc`, {scroll: false});
    });

    it("should set view query param", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set view to non-default value
      result.current.setFilters({view: "grid"});

      // Assert - Verify URL includes 'view' param
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?view=grid`, {scroll: false});
    });

    it("should set multiple filter params including paymentTypes, sortBy, and view", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set multiple filters at once
      result.current.setFilters({
        search: "groceries",
        paymentTypes: [100, 200],
        sortBy: "amount-asc",
        view: "grid",
      });

      // Assert - Verify URL includes all params
      const expectedUrl = `${mockPathname}?q=groceries&pay=100%2C200&sort=amount-asc&view=grid`;
      expect(mockReplace).toHaveBeenCalledWith(expectedUrl, {scroll: false});
    });
  });

  describe("clearFilters", () => {
    it("should remove all URL params", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=test&from=2026-01-01&min=10&cat=100");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.clearFilters();

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(mockPathname, {scroll: false});
    });
  });

  describe("activeFilterCount", () => {
    it("should return 0 when no filters are active", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("should count search query", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=test");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should count date range as one filter", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?from=2026-01-01&to=2026-03-28");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should count amount range as one filter", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?min=10&max=100");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should count categories filter", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?cat=100,200");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should count payment types filter", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?pay=200,300");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should count multiple active filters", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=test&from=2026-01-01&min=10&cat=100&pay=200");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(5);
    });

    it("should not count sort and view mode as active filters", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?sort=amount-desc&view=grid");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(0);
    });
  });
});
