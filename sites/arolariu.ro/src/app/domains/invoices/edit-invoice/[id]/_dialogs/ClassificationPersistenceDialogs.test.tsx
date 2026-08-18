/**
 * @fileoverview Real dialog integrations for safe classification persistence.
 * @module app/domains/invoices/edit-invoice/[id]/dialogs/ClassificationPersistenceDialogs.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationOrigin, ClassificationSystem, type Invoice, type Merchant, type Product} from "@/types/invoices";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../tests/helpers/analysis";
import {buildInvoice, buildMerchant, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import BulkCategoryDialog from "./BulkCategoryDialog";
import ItemsDialog from "./ItemsDialog";
import MerchantDialog from "./MerchantDialog";

const invoiceId = "11111111-1111-4111-8111-111111111111";
const merchantId = "22222222-2222-4222-8222-222222222222";

const persistedProductClassification = {
  system: ClassificationSystem.Gs1Gpc,
  code: "10000111",
  version: "2026-05",
  officialLabel: "Coffee",
  hierarchy: [{level: "brick", code: "10000111", officialLabel: "Coffee"}],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.91,
  evidence: [],
} as const;

const persistedMerchantClassification = {
  system: ClassificationSystem.Nace21,
  code: "47.11",
  version: "2.1",
  officialLabel: "Retail sale in non-specialised stores",
  hierarchy: [{level: "class", code: "47.11", officialLabel: "Retail sale in non-specialised stores"}],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.91,
  evidence: [],
} as const;

function productResponse(product: Product): Response {
  return new Response(
    JSON.stringify({
      name: product.name,
      classification: null,
      quantity: product.quantity,
      quantityUnit: product.quantityUnit,
      productCode: product.productCode,
      price: product.price,
      totalPrice: product.totalPrice,
      metadata: product.metadata,
    }),
    {status: 202},
  );
}

function ItemsDialogHarness({invoice}: Readonly<{invoice: Invoice}>): React.JSX.Element {
  const {isOpen, open} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);
  return (
    <>
      <button onClick={open}>open items</button>
      {isOpen ? <ItemsDialog /> : null}
    </>
  );
}

interface BulkDialogHarnessProps {
  readonly invoice: Invoice;
  readonly product: Product;
}

function BulkDialogHarness({invoice, product}: Readonly<BulkDialogHarnessProps>): React.JSX.Element {
  const {isOpen, open} = useDialog("EDIT_INVOICE__BULK_CATEGORY", "edit", {
    invoice,
    selectedProducts: [product],
    selectedIndices: [0],
  });
  return (
    <>
      <button onClick={open}>open bulk classifications</button>
      {isOpen ? <BulkCategoryDialog /> : null}
    </>
  );
}

function MerchantDialogHarness({merchant}: Readonly<{merchant: Merchant}>): React.JSX.Element {
  const {isOpen, open} = useDialog("EDIT_INVOICE__MERCHANT", "edit", merchant);
  return (
    <>
      <button onClick={open}>open merchant</button>
      {isOpen ? <MerchantDialog /> : null}
    </>
  );
}

function extractClassificationCode(option: HTMLElement): string {
  const code = option.textContent?.match(/\d+(?:\.\d+)*/u)?.[0];
  if (code === undefined) {
    throw new Error("Expected an official classification option code.");
  }

  return code;
}

describe("safe classification persistence dialogs", () => {
  it("converts an existing canonical product classification to an exact selection before saving", async () => {
    // Arrange
    const product = buildProduct({
      name: "Classified coffee",
      classification: persistedProductClassification,
    });
    const invoice = buildInvoice({id: invoiceId, items: [product]});
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? productResponse(product)
        : new Response("Unexpected request", {status: 500}),
    );
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <DialogProvider>
          <ItemsDialogHarness invoice={invoice} />
        </DialogProvider>
      </AnalysisTestProvider>,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "open items"}));
    expect(screen.queryByRole("button", {name: "Clear GS1 GPC classification"})).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /save changes/i}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toContainEqual({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
        init: expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            originalProductName: product.name,
            name: product.name,
            classification: {system: ClassificationSystem.Gs1Gpc, code: persistedProductClassification.code},
            quantity: product.quantity,
            quantityUnit: product.quantityUnit,
            productCode: product.productCode,
            price: product.price,
          }),
        }),
      });
    });
  });

  it("persists the exact bulk GS1 selection without sending canonical display fields", async () => {
    // Arrange
    const product = buildProduct({name: "Bulk coffee"});
    const invoice = buildInvoice({id: invoiceId, items: [product]});
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? productResponse(product)
        : new Response("Unexpected request", {status: 500}),
    );
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <DialogProvider>
          <BulkDialogHarness
            invoice={invoice}
            product={product}
          />
        </DialogProvider>
      </AnalysisTestProvider>,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "open bulk classifications"}));
    await user.click(screen.getByRole("button", {name: "GS1 GPC classification"}));
    await user.type(screen.getByRole("combobox", {name: "GS1 GPC classification"}), "arts");
    const [option] = await screen.findAllByRole("option");
    if (option === undefined) {
      throw new Error("Expected a GS1 classification result.");
    }
    const code = extractClassificationCode(option);
    await user.click(option);
    await user.click(screen.getByRole("button", {name: "Apply to All"}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toContainEqual({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
        init: expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            originalProductName: product.name,
            name: product.name,
            classification: {system: ClassificationSystem.Gs1Gpc, code},
            quantity: product.quantity,
            quantityUnit: product.quantityUnit,
            productCode: product.productCode,
            price: product.price,
          }),
        }),
      });
    });
  });

  it("saves a sparse analyzed merchant through the real dialog and action boundary", async () => {
    // Arrange
    const merchant = buildMerchant({
      id: merchantId,
      classification: persistedMerchantClassification,
      additionalMetadata: {},
      address: {
        fullName: "",
        address: "",
        phoneNumber: "",
        emailAddress: "",
        website: "",
      },
    });
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantId}`
        ? new Response(
            JSON.stringify({
              id: merchantId,
              name: merchant.name,
              description: merchant.description,
              classification: persistedMerchantClassification,
              address: merchant.address,
              parentCompanyId: "00000000-0000-0000-0000-000000000000",
              additionalMetadata: {},
            }),
            {status: 200},
          )
        : new Response("Unexpected request", {status: 500}),
    );
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <DialogProvider>
          <MerchantDialogHarness merchant={merchant} />
        </DialogProvider>
      </AnalysisTestProvider>,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "open merchant"}));
    await user.click(screen.getByRole("button", {name: "NACE 2.1 classification"}));
    await user.type(screen.getByRole("combobox", {name: "NACE 2.1 classification"}), "retail");
    const [option] = await screen.findAllByRole("option");
    if (option === undefined) {
      throw new Error("Expected a NACE classification result.");
    }
    const code = extractClassificationCode(option);
    await user.click(option);
    await user.click(screen.getByRole("button", {name: /save classification/i}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toContainEqual({
        url: `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantId}`,
        init: expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            name: merchant.name,
            description: merchant.description,
            classification: {system: ClassificationSystem.Nace21, code},
            address: merchant.address,
            parentCompanyId: null,
            additionalMetadata: {},
          }),
        }),
      });
    });
  });
});
