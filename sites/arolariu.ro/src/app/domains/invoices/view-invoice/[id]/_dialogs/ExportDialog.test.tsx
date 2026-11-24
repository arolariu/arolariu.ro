// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import DialogContainer from "@/app/domains/invoices/_contexts/DialogContainer";
import {Toaster, toast} from "@arolariu/components";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, describe, expect, it, vi} from "vitest";
import messages from "../../../../../../../messages/en.json";
import frenchMessages from "../../../../../../../messages/fr.json";
import romanianMessages from "../../../../../../../messages/ro.json";
import {buildInvoice, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {InvoiceContextProvider} from "../_context/InvoiceContext";

const invoice = buildInvoice({
  id: "11111111-1111-4111-8111-111111111111",
  items: [buildProduct({name: 'Oats, "rolled"', category: 1010, quantity: 2, price: 3.5})],
});

function ExportTrigger(): React.JSX.Element {
  const {openDialog} = useDialogs();
  return <button onClick={() => openDialog("VIEW_INVOICE__EXPORT", "view")}>Open invoice export</button>;
}

async function openExportDialog(locale = "en", dictionary = messages): Promise<HTMLElement> {
  const exportMessages = dictionary.pages.invoices.viewInvoice.export;
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{
        pages: {invoices: {viewInvoice: {export: exportMessages}}},
        shared: dictionary.shared,
        categories: dictionary.categories,
      }}>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={null}>
        <DialogProvider>
          <ExportTrigger />
          <DialogContainer />
          <Toaster />
        </DialogProvider>
      </InvoiceContextProvider>
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", {name: "Open invoice export"}));
  await act(() => vi.dynamicImportSettled());
  return screen.findByRole("dialog", {name: exportMessages.title});
}

describe("single invoice CSV export", () => {
  afterEach(() => {
    toast.close();
    cleanup();
  });

  it("preserves CSV quoting when exporting the selected invoice through the real dialog", async () => {
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL");
    const downloads: {name: string; href: string; connected: boolean}[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({name: this.download, href: this.href, connected: this.isConnected});
    });
    const dialog = await openExportDialog();

    fireEvent.click(within(dialog).getByRole("button", {name: /^Export as CSV/u}));

    expect(downloads).toEqual([
      {name: "invoice-11111111-1111-4111-8111-111111111111.csv", href: expect.stringMatching(/^blob:/u), connected: true},
    ]);
    expect(createUrl).toHaveBeenCalledOnce();
    const blob = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new TypeError("Expected the export to generate a CSV Blob");
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    await expect(blob.text()).resolves.toBe(
      `"Product Name","Quantity","Price","Total","Product category"\n"Oats, ""rolled""",2,3.50,7.00,"Oats"`,
    );
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(downloads[0]?.href);
    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Export Invoice"})).not.toBeInTheDocument());
  });

  it.each([
    ["ro", romanianMessages, `"Denumirea produsului","Cantitate","Preț","Total","Categoria produsului"`],
    ["fr", frenchMessages, `"Nom du produit","Quantité","Prix","Total","Catégorie du produit"`],
  ] as const)("exports a fully localized CSV header in %s", async (locale, dictionary, expected) => {
    const createUrl = vi.spyOn(URL, "createObjectURL");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const dialog = await openExportDialog(locale, dictionary);
    const csvTitle = dictionary.pages.invoices.viewInvoice.export.csv.title;

    fireEvent.click(within(dialog).getByRole("button", {name: (label) => label.startsWith(csvTitle)}));

    const blob = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new TypeError("Expected the export to generate a CSV Blob");
    expect((await blob.text()).split("\n")[0]).toBe(expected);
  });

  it("keeps a failed export open and announces the error", async () => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      throw new Error("Object URL unavailable");
    });
    const navigate = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const dialog = await openExportDialog();

    fireEvent.click(within(dialog).getByRole("button", {name: /^Export as CSV/u}));

    expect(await screen.findByText("Failed to export CSV")).toBeInTheDocument();
    expect(dialog).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Failed to export CSV:", expect.any(Error));
  });
});
