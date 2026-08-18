/**
 * @fileoverview Real dialog integrations for safe classification persistence.
 * @module app/domains/invoices/edit-invoice/[id]/dialogs/ClassificationPersistenceDialogs.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {ClassificationOrigin, ClassificationSystem, type Invoice, type Merchant, type Product} from "@/types/invoices";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../tests/helpers/analysis";
import {buildInvoice, buildMerchant, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import BulkCategoryDialog from "./BulkCategoryDialog";
import ItemsDialog from "./ItemsDialog";
import MerchantDialog from "./MerchantDialog";

vi.mock("@/lib/actions/user/fetchUser");
const mockFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);

const invoiceId = "11111111-1111-4111-8111-111111111111";
const merchantId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  mockFetchBffUser.mockResolvedValue({
    user: null,
    userIdentifier: "33333333-3333-4333-8333-333333333333",
    userJwt: "test-jwt",
  });
});

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
  return new Response(JSON.stringify({...product, classification: null}), {status: 202});
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
  it("keeps an existing analyzed product classification untouched while saving another product change", async () => {
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
    const updatedName = "Classified coffee beans";
    await user.clear(screen.getByDisplayValue(product.name));
    await user.type(screen.getByDisplayValue(""), updatedName);
    await user.click(screen.getByRole("button", {name: /save changes/i}));

    // Assert
    await waitFor(() => {
      const request = getAnalysisApiRequests().find((candidate) => candidate.url.endsWith(`/invoices/${invoiceId}/products`));
      expect(request?.init?.method).toBe("PUT");
      const body = JSON.parse(String(request?.init?.body)) as {
        readonly selector: {readonly originalName: string};
        readonly classification: unknown;
      };
      expect(body).toMatchObject({
        selector: {originalName: product.name},
      });
      expect(body.classification).toBeNull();
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
      const request = getAnalysisApiRequests().find((candidate) => candidate.url.endsWith(`/invoices/${invoiceId}/products`));
      expect(request?.init?.method).toBe("PUT");
      expect(JSON.parse(String(request?.init?.body))).toMatchObject({
        selector: {originalName: product.name, originalQuantity: product.quantity},
        classification: {system: ClassificationSystem.Gs1Gpc, code},
      });
    });
  });

  it("saves a sparse analyzed merchant through the real dialog and action boundary", async () => {
    // Arrange
    const merchant = buildMerchant({
      id: merchantId,
      classification: persistedMerchantClassification,
      parentCompanyId: "",
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
        ? new Response(JSON.stringify(buildMerchant({...merchant, id: merchantId, classification: persistedMerchantClassification})), {
            status: 200,
          })
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
