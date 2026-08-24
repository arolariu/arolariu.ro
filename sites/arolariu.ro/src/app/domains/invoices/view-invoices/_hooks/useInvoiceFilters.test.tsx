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
        classificationGroups: [],
        paymentTypes: [],
        currencies: [],
        sortBy: "date",
        sortOrder: "desc",
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

    it("should parse comma-separated classification groups from URL param 'grp'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?grp=Food+and+non-alcoholic+beverages,Transport");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.classificationGroups).toEqual(["Food and non-alcoholic beverages", "Transport"]);
    });

    it("should filter out empty strings from classification groups array", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?grp=Food+and+non-alcoholic+beverages,,Transport");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.classificationGroups).toEqual(["Food and non-alcoholic beverages", "Transport"]);
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

    it("should parse sort field from URL param 'sortBy'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?sortBy=amount");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.sortBy).toBe("amount");
    });

    it("should parse sort direction from URL param 'sortOrder'", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?sortOrder=asc");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.sortOrder).toBe("asc");
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

    it("should remove 'filter out invalid numbers' placeholder - classification groups are strings not numbers", () => {
      // Arrange: all non-empty strings are valid groups
      const mockSearchParams = new URLSearchParams("?grp=Food+and+non-alcoholic+beverages");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.filters.classificationGroups).toEqual(["Food and non-alcoholic beverages"]);
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

    it("should update URL with classification groups", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({classificationGroups: ["Food and non-alcoholic beverages", "Transport"]});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("grp="), {scroll: false});
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

    it("should not include null sort field in URL", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({sortBy: null, sortOrder: null});

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(mockPathname, {scroll: false});
    });

    it("should not include null sort direction in URL", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act
      result.current.setFilters({sortBy: null, sortOrder: null});

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

    it("should set sort query params", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set sort to non-default values
      result.current.setFilters({sortBy: "amount", sortOrder: "asc"});

      // Assert - Verify URL includes both 'sortBy' and 'sortOrder' params
      expect(mockReplace).toHaveBeenCalledWith(`${mockPathname}?sortBy=amount&sortOrder=asc`, {scroll: false});
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

    it("should set multiple filter params including paymentTypes, sortBy, sortOrder, and view", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams();
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());

      // Act - Set multiple filters at once
      result.current.setFilters({
        search: "groceries",
        paymentTypes: [100, 200],
        sortBy: "amount",
        sortOrder: "asc",
        view: "grid",
      });

      // Assert - Verify URL includes all params
      const expectedUrl = `${mockPathname}?q=groceries&pay=100%2C200&sortBy=amount&sortOrder=asc&view=grid`;
      expect(mockReplace).toHaveBeenCalledWith(expectedUrl, {scroll: false});
    });
  });

  describe("clearFilters", () => {
    it("should remove all URL params", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?q=test&from=2026-01-01&min=10&grp=Food");
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

    it("should count classification groups filter", () => {
      // Arrange
      const mockSearchParams = new URLSearchParams("?grp=Food+and+non-alcoholic+beverages,Transport");
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
      const mockSearchParams = new URLSearchParams("?q=test&from=2026-01-01&min=10&grp=Food&pay=200");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(5);
    });

    it("should not count default sort or view mode as active filters", () => {
      // Default sort is now date/desc — only view-mode change should NOT contribute.
      // Arrange
      const mockSearchParams = new URLSearchParams("?view=grid");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      // Act
      const {result} = renderHook(() => useInvoiceFilters());

      // Assert
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("should count non-default sort as an active filter", () => {
      // Anything other than date/desc counts toward the badge to keep the
      // header in sync with the Sort card's active visual.
      const mockSearchParams = new URLSearchParams("?sortBy=amount&sortOrder=asc");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

      const {result} = renderHook(() => useInvoiceFilters());

      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe("currencies field", () => {
    it("parses ?cur=RON,EUR into filters.currencies", () => {
      const mockSearchParams = new URLSearchParams("?cur=RON,EUR");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      expect(result.current.filters.currencies).toEqual(["RON", "EUR"]);
    });

    it("defaults to empty array when ?cur is absent", () => {
      const mockSearchParams = new URLSearchParams("");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      expect(result.current.filters.currencies).toEqual([]);
    });

    it("writes 'cur' to URL when setFilters({currencies}) is called", () => {
      const mockSearchParams = new URLSearchParams("");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      result.current.setFilters({currencies: ["RON", "EUR"]});
      const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain("cur=RON%2CEUR");
    });

    it("removes 'cur' from URL when setFilters({currencies: []}) is called", () => {
      const mockSearchParams = new URLSearchParams("?cur=RON,EUR");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      result.current.setFilters({currencies: []});
      const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).not.toContain("cur=");
    });

    it("counts non-empty currencies toward activeFilterCount", () => {
      const mockSearchParams = new URLSearchParams("?cur=RON");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      expect(result.current.activeFilterCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("sort default flip", () => {
    it("defaults sortBy to 'date' and sortOrder to 'desc' when both URL params are absent", () => {
      const mockSearchParams = new URLSearchParams("");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      expect(result.current.filters.sortBy).toBe("date");
      expect(result.current.filters.sortOrder).toBe("desc");
    });

    it("does not write sortBy/sortOrder to URL when value matches the new default", () => {
      const mockSearchParams = new URLSearchParams("");
      (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
      const {result} = renderHook(() => useInvoiceFilters());
      result.current.setFilters({sortBy: "date", sortOrder: "desc"});
      const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).not.toContain("sortBy=");
      expect(lastCall).not.toContain("sortOrder=");
    });
  });
});
