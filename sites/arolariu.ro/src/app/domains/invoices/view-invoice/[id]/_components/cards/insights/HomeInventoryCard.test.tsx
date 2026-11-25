import {ProductCategory} from "@/types/invoices/Category";
import {InvoiceBuilder} from "@/data/mocks/invoice";
import {ProductBuilder} from "@/data/mocks/product";
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {InvoiceContextProvider} from "../../../_context/InvoiceContext";
import {HomeInventoryCard} from "./HomeInventoryCard";

describe("HomeInventoryCard", () => {
  it("renders stock levels for products in the selected cleaning category", () => {
    const cleaningProduct = new ProductBuilder()
      .withName("Surface cleaner")
      .withProductCode("cleaner-1")
      .withCategory(ProductCategory.HouseholdCleaners)
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

  it("omits stock levels when no product has explicit a household cleaning category", () => {
    const unrelatedProduct = new ProductBuilder().withName("Orange juice").withCategory(ProductCategory.Juice).build();
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
