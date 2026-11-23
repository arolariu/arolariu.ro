// @vitest-environment happy-dom

import type {Invoice} from "@/types/invoices";
import "@testing-library/jest-dom/vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it} from "vitest";
import messages from "../../../../../../../../messages/en.json";
import {buildInvoice, buildMerchant, buildProduct, buildRecipeSuggestion} from "../../../../../../../../tests/helpers/builders/domain";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {InvoiceHealthScore} from "./InvoiceHealthScore";

const category = 1007;
const zeroPayment = {...buildInvoice().paymentInformation, totalCostAmount: 0};

function renderScore(invoice: Invoice): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={{pages: {invoices: {viewInvoice: {healthScore: messages.pages.invoices.viewInvoice.healthScore}}}}}>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={invoice.merchantReference ? buildMerchant({id: invoice.merchantReference}) : null}>
        <InvoiceHealthScore />
      </InvoiceContextProvider>
    </NextIntlClientProvider>,
  );
}

describe("InvoiceHealthScore", () => {
  it("counts only active items, ignores unknown OCR confidence, and shows the remaining improvements", () => {
    const metadata = buildProduct().metadata;
    const invoice = buildInvoice({
      id: "11111111-1111-4111-8111-111111111111",
      items: [
        buildProduct({name: "Oats", category, metadata: {...metadata, confidence: 0}}),
        buildProduct({name: "Milk", metadata: {...metadata, isComplete: false, confidence: 0.6}}),
        buildProduct({name: "Removed item", category, metadata: {...metadata, isSoftDeleted: true}}),
      ],
      merchantReference: "",
      paymentInformation: zeroPayment,
    });

    renderScore(invoice);

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    expect(screen.getByText(/products incomplete/)).toHaveTextContent(/^1 products incomplete/);
    expect(screen.getByText(/Low OCR confidence/)).toHaveTextContent(/^Low OCR confidence on 1 products/);
    expect(screen.getByText(/products uncategorized/)).toHaveTextContent(/^1 products uncategorized/);
    expect(screen.getByText(/No merchant linked/)).toBeInTheDocument();
    expect(screen.getByText(/Incomplete payment information/)).toBeInTheDocument();
    expect(screen.queryByText(/No products found/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Edit Invoice"})).toHaveAttribute("href", `/domains/invoices/edit-invoice/${invoice.id}`);
  });

  it("shows a complete score without repair links and lets the user inspect and hide the factor breakdown", () => {
    const invoice = buildInvoice({
      items: [buildProduct({category})],
      possibleRecipes: [buildRecipeSuggestion({description: "A quick meal from the receipt"})],
    });
    renderScore(invoice);
    expect(screen.queryByText("OCR confidence")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Show factor breakdown"}));

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "Suggested Improvements"})).not.toBeInTheDocument();
    expect(screen.queryByRole("link", {name: "Edit Invoice"})).not.toBeInTheDocument();
    expect(screen.getByText("OCR confidence")).toHaveTextContent("100%");
    expect(screen.getByText("Recipes generated")).toHaveTextContent("(1)");

    fireEvent.click(screen.getByRole("button", {name: "Hide factor breakdown"}));

    expect(screen.getByRole("button", {name: "Show factor breakdown"})).toHaveAttribute("aria-expanded", "false");
  });

  it("distinguishes an empty invoice from a useful invoice with incomplete metadata", () => {
    const empty = buildInvoice({items: [], merchantReference: "", paymentInformation: zeroPayment});
    const {unmount} = renderScore(empty);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByText(/No products found/)).toBeInTheDocument();
    unmount();

    renderScore(buildInvoice({merchantReference: ""}));

    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.queryByText(/No products found/)).not.toBeInTheDocument();
  });
});
