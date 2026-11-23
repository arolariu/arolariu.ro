// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {DialogProvider, useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import type {Merchant} from "@/types/invoices";
import {toast, Toaster} from "@arolariu/components";
import {act, cleanup, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import messages from "../../../../../../messages/en.json";
import {buildInvoice, buildMerchant, buildProduct} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {fetchInvoice} from "../../_actions/invoices/fetchInvoice";
import {fetchMerchant} from "../../_actions/merchants/fetchMerchant";
import InvoiceCard from "./_cards/InvoiceCard";
import InvoiceHeader from "./_components/InvoiceHeader";
import {EditInvoiceContextProvider} from "./_context/EditInvoiceContext";
import MerchantDialog from "./_dialogs/MerchantDialog";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
vi.mock("next/navigation", () => ({useRouter: () => ({refresh})}));

const invoiceId = "11111111-1111-4111-8111-111111111111";
const merchantId = "22222222-2222-4222-8222-222222222222";
const invoicePath = `/rest/v1/invoices/${invoiceId}`;
const productPath = `${invoicePath}/products`;
const merchantPath = `/rest/v1/merchants/${merchantId}`;
const saveReceipt = messages.shared.invoices.invoiceHeader.buttons.save;
const skipAnimations = MotionGlobalConfig.skipAnimations;

function seedBackend() {
  let product = buildProduct({name: "Dairy carton", category: null});
  let invoice = buildInvoice({
    id: invoiceId,
    userIdentifier: "33333333-3333-4333-8333-333333333333",
    merchantReference: merchantId,
    items: [product],
    category: null,
  });
  let merchant = buildMerchant({id: merchantId, category: null});
  const writes: {path: string; body: unknown}[] = [];
  fetchAtHttp.mockImplementation(async (input, options) => {
    const {origin, pathname} = new URL(String(input));
    if (origin !== apiUrl) throw new Error("Unexpected external request");
    if (options?.method === "GET" || options?.method === undefined) {
      if (pathname === invoicePath) return Response.json(invoice);
      if (pathname === merchantPath) return Response.json(merchant);
    }
    const body: unknown = JSON.parse(String(options?.body));
    writes.push({path: pathname, body});
    if (pathname === invoicePath && options?.method === "PATCH") {
      invoice = {...invoice, ...(body as Pick<typeof invoice, "category">)};
      return Response.json(invoice, {status: 202});
    }
    if (pathname === merchantPath && options?.method === "PUT") {
      merchant = {...merchant, ...(body as Pick<typeof merchant, "category">)};
      return Response.json(merchant, {status: 202});
    }
    if (pathname === productPath && options?.method === "PUT") {
      product = {...product, category: (body as Pick<typeof product, "category">).category};
      invoice = {...invoice, items: [product]};
      return Response.json(product, {status: 202});
    }
    throw new Error("Unexpected editor request");
  });
  return writes;
}

function MerchantTrigger({merchant, label = "Open merchant"}: Readonly<{merchant: Merchant; label?: string}>): React.JSX.Element {
  const {open} = useDialog("EDIT_INVOICE__MERCHANT", "view", merchant);
  return (
    <button
      type='button'
      onClick={open}>
      {label}
    </button>
  );
}

async function mountEditors(otherMerchant?: Merchant) {
  const [invoice, merchant] = await Promise.all([fetchInvoice({invoiceId}), fetchMerchant({merchantId})]);
  if (!invoice.success || !merchant.success) throw new Error("Fixture could not load the edit screen");
  return render(
    <NextIntlClientProvider
      locale='en'
      timeZone='UTC'
      messages={messages}>
      <DialogProvider>
        <EditInvoiceContextProvider
          invoice={invoice.data}
          merchant={merchant.data}>
          <InvoiceHeader />
          <InvoiceCard />
          <MerchantTrigger merchant={merchant.data} />
          {otherMerchant === undefined ? null : (
            <MerchantTrigger
              label='Open other merchant'
              merchant={otherMerchant}
            />
          )}
          <MerchantDialog />
          <Toaster />
        </EditInvoiceContextProvider>
      </DialogProvider>
    </NextIntlClientProvider>,
  );
}

async function choose(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, label: string): Promise<void> {
  await act(() => user.type(input, label));
  const option = await screen.findByRole("option", {name: label});
  await act(() => user.click(option));
}

describe("individual category editors", () => {
  beforeEach(() => {
    MotionGlobalConfig.skipAnimations = true;
    vi.spyOn(globalThis.window.location, "reload").mockImplementation(() => {});
  });

  afterEach(() => {
    toast.close();
    cleanup();
    MotionGlobalConfig.skipAnimations = skipAnimations;
  });

  it("saves and clears the receipt category and reloads both values", async () => {
    const writes = seedBackend();
    const user = userEvent.setup();
    let page = await mountEditors();
    await choose(user, screen.getByRole("combobox", {name: "Receipt category"}), "Groceries");
    await act(() => user.click(screen.getByRole("button", {name: saveReceipt})));
    expect(writes).toEqual([{path: invoicePath, body: {category: 3001}}]);

    page.unmount();
    page = await mountEditors();
    expect(screen.getByRole("combobox", {name: "Receipt category"})).toHaveValue("Groceries");
    await act(() => user.click(screen.getByRole("button", {name: "Clear category"})));
    await act(() => user.click(screen.getByRole("button", {name: saveReceipt})));
    expect(writes.at(-1)).toEqual({path: invoicePath, body: {category: null}});

    page.unmount();
    await mountEditors();
    expect(screen.getByRole("combobox", {name: "Receipt category"})).toHaveValue("");
  });

  it("persists only the selected product's category and can clear it after reloading", async () => {
    const writes = seedBackend();
    const user = userEvent.setup();
    let page = await mountEditors();
    const row = () => within(screen.getByRole("row", {name: /Select Dairy carton/u}));
    await act(() => user.click(row().getByRole("button", {name: "Product category: Dairy carton"})));
    await choose(user, row().getByRole("combobox", {name: "Product category: Dairy carton"}), "Milk");
    await act(() => user.click(row().getByRole("button", {name: "Save category"})));
    expect(writes).toEqual([{path: productPath, body: {originalProductName: "Dairy carton", category: 1014}}]);

    page.unmount();
    page = await mountEditors();
    const edit = row().getByRole("button", {name: "Product category: Dairy carton"});
    expect(edit).toHaveTextContent("Milk");
    await act(() => user.click(edit));
    await act(() => user.click(row().getByRole("button", {name: "Clear category"})));
    await act(() => user.click(row().getByRole("button", {name: "Save category"})));
    expect(writes.at(-1)).toEqual({path: productPath, body: {originalProductName: "Dairy carton", category: null}});

    page.unmount();
    await mountEditors();
    expect(row().getByRole("button", {name: "Product category: Dairy carton"})).toHaveTextContent("Uncategorized");
  });

  it("refreshes the merchant badge immediately and retains set and clear across reloads", async () => {
    const writes = seedBackend();
    const user = userEvent.setup();
    const open = async () => {
      await act(() => user.click(screen.getByRole("button", {name: "Open merchant"})));
      return within(await screen.findByRole("dialog"));
    };
    let page = await mountEditors();
    let dialog = await open();
    await choose(user, dialog.getByRole("combobox", {name: "Merchant category"}), "Supermarket");
    await act(() => user.click(dialog.getByRole("button", {name: "Save category"})));
    expect(writes).toEqual([{path: merchantPath, body: {category: 2001}}]);
    expect(dialog.getByText("Supermarket")).toBeVisible();

    page.unmount();
    page = await mountEditors();
    dialog = await open();
    expect(dialog.getByRole("combobox", {name: "Merchant category"})).toHaveValue("Supermarket");
    await act(() => user.click(dialog.getByRole("button", {name: "Clear category"})));
    await act(() => user.click(dialog.getByRole("button", {name: "Save category"})));
    expect(writes.at(-1)).toEqual({path: merchantPath, body: {category: null}});

    page.unmount();
    await mountEditors();
    dialog = await open();
    expect(dialog.getByRole("combobox", {name: "Merchant category"})).toHaveValue("");
  });

  it("does not apply a late save or notification to a newly opened merchant dialog", async () => {
    seedBackend();
    const user = userEvent.setup();
    const otherMerchant = buildMerchant({id: "44444444-4444-4444-8444-444444444444", category: null});
    await mountEditors(otherMerchant);
    await act(() => user.click(screen.getByRole("button", {name: "Open merchant"})));
    const first = within(await screen.findByRole("dialog"));
    await choose(user, first.getByRole("combobox", {name: "Merchant category"}), "Supermarket");

    const pending = Promise.withResolvers<Response>();
    fetchAtHttp.mockImplementationOnce(() => pending.promise);
    const save = first.getByRole("button", {name: "Save category"});
    await act(() => user.click(save));
    expect(save).toBeDisabled();
    await act(() => user.click(first.getByRole("button", {name: messages.shared.accessibility.close})));
    await act(() => user.click(screen.getByRole("button", {name: "Open other merchant"})));
    const next = within(await screen.findByRole("dialog"));
    const input = next.getByRole("combobox", {name: "Merchant category"});
    await choose(user, input, "Bakery");

    await act(() => pending.resolve(Response.json(buildMerchant({id: merchantId, category: 2001}))));

    expect(input).toHaveValue("Bakery");
    expect(next.getByRole("button", {name: "Save category"})).toBeEnabled();
    expect(screen.queryByText(messages.categories.ui.saved)).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the merchant draft on conflict rather than retrying or showing it as saved", async () => {
    seedBackend();
    const user = userEvent.setup();
    await mountEditors();
    await act(() => user.click(screen.getByRole("button", {name: "Open merchant"})));
    const dialog = within(await screen.findByRole("dialog"));
    const input = dialog.getByRole("combobox", {name: "Merchant category"});
    await choose(user, input, "Supermarket");
    fetchAtHttp.mockResolvedValueOnce(new Response(null, {status: 409}));

    await act(() => user.click(dialog.getByRole("button", {name: "Save category"})));

    expect(await screen.findByText(messages.categories.ui.merchantConflict)).toBeVisible();
    expect(dialog.getByText(messages.categories.ui.unclassified)).toBeVisible();
    expect(input).toHaveValue("Supermarket");
    expect(fetchAtHttp.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
