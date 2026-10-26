import {InvoiceBuilder} from "@/data/mocks/invoice";
import {ProductBuilder} from "@/data/mocks/product";
import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {InvoiceContextProvider} from "../../../_context/InvoiceContext";
import {HomeInventoryCard, isGs1CleaningOrHygieneClassification} from "./HomeInventoryCard";

function classification(system: ClassificationSystem, rootCode: string, rootLabel: string): StandardClassification {
  return {
    system,
    version: "test",
    code: rootCode,
    officialLabel: rootLabel,
    hierarchy: [{level: "segment", code: rootCode, officialLabel: rootLabel}],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

describe("isGs1CleaningOrHygieneClassification", () => {
  it("accepts the explicit GS1 cleaning and hygiene segment", () => {
    expect(isGs1CleaningOrHygieneClassification(classification(ClassificationSystem.Gs1Gpc, "47000000", "Cleaning/Hygiene Products"))).toBe(
      true,
    );
  });

  it("does not infer cleaning semantics from labels, another system, or a code prefix", () => {
    expect(isGs1CleaningOrHygieneClassification(classification(ClassificationSystem.Gs1Gpc, "47999999", "Cleaning detergent"))).toBe(false);
    expect(
      isGs1CleaningOrHygieneClassification(classification(ClassificationSystem.EcoicopV2, "47000000", "Cleaning/Hygiene Products")),
    ).toBe(false);
    expect(isGs1CleaningOrHygieneClassification(null)).toBe(false);
  });
});

describe("HomeInventoryCard", () => {
  it("renders stock levels for products in the GS1 cleaning and hygiene segment", () => {
    const cleaningProduct = new ProductBuilder()
      .withName("Surface cleaner")
      .withProductCode("cleaner-1")
      .withClassification(classification(ClassificationSystem.Gs1Gpc, "47000000", "Cleaning/Hygiene Products"))
      .build();
    const invoice = new InvoiceBuilder().withItems([cleaningProduct]).withPaymentCurrency("RON").build();

    render(
      <InvoiceContextProvider
        invoice={invoice}
        merchant={null}>
        <HomeInventoryCard />
      </InvoiceContextProvider>,
    );

    expect(screen.getByText("Surface cleaner")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.homeInventoryCard.stockLevels.title")).toBeInTheDocument();
  });

  it("omits stock levels when no product has explicit GS1 cleaning taxonomy evidence", () => {
    const unrelatedProduct = new ProductBuilder()
      .withName("Orange juice")
      .withClassification(classification(ClassificationSystem.Gs1Gpc, "50000000", "Food/Beverage/Tobacco"))
      .build();
    const invoice = new InvoiceBuilder().withItems([unrelatedProduct]).build();

    render(
      <InvoiceContextProvider
        invoice={invoice}
        merchant={null}>
        <HomeInventoryCard />
      </InvoiceContextProvider>,
    );

    expect(screen.queryByText("cards.invoices.homeInventoryCard.stockLevels.title")).not.toBeInTheDocument();
    expect(screen.getByText("cards.invoices.homeInventoryCard.eco.title")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.homeInventoryCard.bulk.title")).toBeInTheDocument();
  });
});
