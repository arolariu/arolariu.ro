import {InvoiceContextProvider} from "../../../_context/InvoiceContext";
import {buildInvoice} from "../../../../../../../../../tests/helpers/builders/domain";
import enMessages from "../../../../../../../../../messages/en.json";
import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it} from "vitest";
import {NutritionCard} from "./NutritionCard";

describe("NutritionCard", () => {
  it("reports that an empty invoice has no items available for allergen assessment", () => {
    render(
      <NextIntlClientProvider
        locale='en'
        messages={enMessages}>
        <InvoiceContextProvider
          invoice={buildInvoice({items: []})}
          merchant={null}>
          <NutritionCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("cards.invoices.nutritionCard.allergens.noItems")).toBeInTheDocument();
    expect(enMessages.cards.invoices.nutritionCard.allergens.noItems).toBe("No invoice items are available for allergen assessment.");
    expect(screen.queryByText("cards.invoices.nutritionCard.allergens.title")).not.toBeInTheDocument();
  });
});
