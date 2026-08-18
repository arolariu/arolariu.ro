/** @vitest-environment happy-dom */

import {renderHook} from "@testing-library/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoiceFilters} from "./useInvoiceFilters";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe("useInvoiceFilters", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({replace});
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/domains/invoices");
  });

  it("reads stable classification filter keys", () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams("classification=ECOICOP_V2%3A01.1"));

    expect(renderHook(() => useInvoiceFilters()).result.current.filters.classifications).toEqual(["ECOICOP_V2:01.1"]);
  });

  it("writes stable classification filter keys", () => {
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams());
    const {result} = renderHook(() => useInvoiceFilters());

    result.current.setFilters({classifications: ["ECOICOP_V2:01.1"]});

    expect(replace).toHaveBeenCalledWith("/domains/invoices?classification=ECOICOP_V2%3A01.1", {scroll: false});
  });
});
