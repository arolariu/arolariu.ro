import {ClassificationSystem, PaymentType} from "@/types/invoices";
import {buildClassification, buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {describe, expect, it} from "vitest";
import {computeAvailableClassifications, computeAvailableCurrencies, computeAvailablePaymentTypes} from "./filterOptions";

describe("filterOptions", () => {
  it("derives stable classification keys and official labels from present DTOs", () => {
    const classification = buildClassification({
      system: ClassificationSystem.EcoicopV2,
      code: "01.1",
      officialLabel: "Food",
      hierarchy: [{level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"}],
    });
    const invoices = [buildInvoice({classification}), buildInvoice({id: "44444444-4444-7444-8444-444444444444", classification})];

    expect(computeAvailableClassifications(invoices)).toEqual([{key: "ECOICOP_V2:01.1", label: "Food", rootCode: "01"}]);
  });

  it("only includes observed currency and payment values", () => {
    const invoice = buildInvoice({
      paymentInformation: {
        ...buildInvoice().paymentInformation,
        paymentType: PaymentType.Cash,
        currency: {code: "EUR", name: "Euro", symbol: "€"},
      },
    });

    expect(computeAvailableCurrencies([invoice])).toEqual(["EUR"]);
    expect(computeAvailablePaymentTypes([invoice])).toEqual([PaymentType.Cash]);
  });
});
