import {InvoiceCategory} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {expect, it, vi} from "vitest";
import messages from "../../../../../../../../../messages/en.json";
import {buildInvoice} from "../../../../../../../../../tests/helpers/builders/domain";
import {InvoiceContextProvider} from "../../../_context/InvoiceContext";
import {GeneralExpenseCard} from "./GeneralExpenseCard";

vi.unmock("next-intl");
vi.unmock("next-intl-selector");

it("shows the receipt's saved category instead of a fabricated detection and confidence", () => {
  render(
    <NextIntlClientProvider
      locale='en'
      messages={messages}>
      <InvoiceContextProvider
        invoice={buildInvoice({category: InvoiceCategory.RailTravel})}
        merchant={null}>
        <GeneralExpenseCard />
      </InvoiceContextProvider>
    </NextIntlClientProvider>,
  );

  expect(screen.getByText(messages.categories.invoices.railTravel)).toBeVisible();
  expect(screen.queryByText("Electronics / Technology")).not.toBeInTheDocument();
  expect(screen.queryByText("Confidence: 87%")).not.toBeInTheDocument();
});
