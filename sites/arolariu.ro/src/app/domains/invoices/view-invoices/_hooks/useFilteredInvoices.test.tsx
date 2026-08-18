import {ClassificationSystem, PaymentType} from "@/types/invoices";
import {buildClassification, buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useFilteredInvoices} from "./useFilteredInvoices";
import type {FilterState} from "./useInvoiceFilters";

const filters: FilterState = {
  search: "",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  classifications: [],
  paymentTypes: [],
  currencies: [],
  sortBy: "date",
  sortOrder: "desc",
  view: "table",
};

describe("useFilteredInvoices", () => {
  it("filters with stable system-code classification keys", () => {
    const food = buildClassification({system: ClassificationSystem.EcoicopV2, code: "01.1", officialLabel: "Food"});
    const transport = buildClassification({system: ClassificationSystem.EcoicopV2, code: "07.2", officialLabel: "Transport"});
    const invoices = [
      buildInvoice({classification: food}),
      buildInvoice({id: "44444444-4444-7444-8444-444444444444", classification: transport}),
    ];

    const {result} = renderHook(() => useFilteredInvoices(invoices, {...filters, classifications: ["ECOICOP_V2:07.2"]}));

    expect(result.current).toEqual([invoices[1]]);
  });

  it("combines observed payment and currency filters", () => {
    const euro = buildInvoice({
      paymentInformation: {
        ...buildInvoice().paymentInformation,
        paymentType: PaymentType.Cash,
        currency: {code: "EUR", name: "Euro", symbol: "€"},
      },
    });
    const ron = buildInvoice({id: "44444444-4444-7444-8444-444444444444"});

    const {result} = renderHook(() =>
      useFilteredInvoices([euro, ron], {...filters, paymentTypes: [PaymentType.Cash], currencies: ["EUR"]}),
    );

    expect(result.current).toEqual([euro]);
  });
});
