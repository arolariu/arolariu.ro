// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {ProductCategory, type Invoice, type Product} from "@/types/invoices";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, describe, expect, it} from "vitest";
import messages from "../../../../../../../messages/en.json";
import {buildInvoice, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import AllergenDialog from "./AllergenDialog";

const product: Product = buildProduct({name: "Milk", category: ProductCategory.Milk});
const invoice: Invoice = buildInvoice({id: "11111111-1111-4111-8111-111111111111", items: [product]});
const initialSkipAnimations = MotionGlobalConfig.skipAnimations;

function OpenAllergenDialog(): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <>
      <button
        type='button'
        onClick={() => openDialog("EDIT_INVOICE__ALLERGENS", "edit", {invoice, product, productIndex: 0})}>
        Open allergen editor
      </button>
      <AllergenDialog />
    </>
  );
}

describe("AllergenDialog", () => {
  afterEach(() => {
    MotionGlobalConfig.skipAnimations = initialSkipAnimations;
  });

  it("saves allergen edits without resubmitting the product category", async () => {
    MotionGlobalConfig.skipAnimations = true;
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 409}));
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <DialogProvider>
          <OpenAllergenDialog />
        </DialogProvider>
      </NextIntlClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", {name: "Open allergen editor"}));
    await userEvent.click(screen.getByRole("button", {name: /save/i}));
    await waitFor(() => expect(fetchAtHttp).toHaveBeenCalledOnce());

    const [, request] = fetchAtHttp.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).not.toHaveProperty("category");
  });
});
