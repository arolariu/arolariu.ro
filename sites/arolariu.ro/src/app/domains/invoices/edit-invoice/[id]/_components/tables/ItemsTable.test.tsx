import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {ProductCategory, type Invoice} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import messages from "../../../../../../../../messages/en.json";
import {buildInvoice, buildProduct} from "../../../../../../../../tests/helpers/builders/domain";
import ItemsTable from "./ItemsTable";

vi.unmock("next-intl");
vi.unmock("next-intl-selector");

function renderItems(invoice: Invoice): ReturnType<typeof render> {
  return render(<ItemsTable invoice={invoice} />, {
    wrapper: ({children}) => (
      <NextIntlClientProvider
        locale='en'
        messages={{
          categories: messages.categories,
          pages: {invoices: {editInvoice: {itemsTable: messages.pages.invoices.editInvoice.itemsTable}}},
        }}>
        <DialogProvider>{children}</DialogProvider>
      </NextIntlClientProvider>
    ),
  });
}

describe("ItemsTable", () => {
  const skipAnimations = MotionGlobalConfig.skipAnimations;

  beforeEach(() => {
    // Happy DOM does not settle cancelled Motion animations on unmount.
    MotionGlobalConfig.skipAnimations = true;
  });

  afterEach(() => {
    toast.close();
    MotionGlobalConfig.skipAnimations = skipAnimations;
  });

  it("applies sorting before pagination and keeps a case-insensitive search within the matching rows", () => {
    const items = ["Oats", "Blueberries", "Apples", "Milk", "Rice", "Carrots"].map((name) => buildProduct({name}));
    renderItems(buildInvoice({items}));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Next"}));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Carrots"})).toBeInTheDocument();

    fireEvent.click(screen.getByRole("columnheader", {name: "Name"}));

    expect(screen.getByRole("cell", {name: "Rice"})).toBeInTheDocument();
    expect(screen.queryByRole("cell", {name: "Carrots"})).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search items..."), {target: {value: "BLUE"}});

    expect(screen.getByRole("cell", {name: "Blueberries"})).toBeInTheDocument();
    expect(screen.queryByRole("cell", {name: "Rice"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Next"})).not.toBeInTheDocument();
  });

  it("commits quantity for the displayed sorted item and discards a subsequent draft on Escape", () => {
    const oats = buildProduct({name: "Oats", quantity: 2, quantityUnit: "kg", price: 3.5});
    const milk = buildProduct({name: "Milk", quantity: 1, quantityUnit: "L"});
    renderItems(buildInvoice({items: [oats, milk]}));
    fireEvent.click(screen.getByRole("columnheader", {name: "Name"}));
    const oatRow = within(screen.getByRole("row", {name: /Select Oats/}));

    fireEvent.click(oatRow.getByRole("cell", {name: "2 kg"}));
    const quantity = oatRow.getByRole("spinbutton", {name: "Edit Quantity for Oats"});
    expect(quantity).toHaveFocus();
    fireEvent.change(quantity, {target: {value: "5"}});
    fireEvent.keyDown(quantity, {key: "Enter"});

    expect(oatRow.getByRole("cell", {name: "5 kg"})).toBeInTheDocument();
    expect(oatRow.getByRole("cell", {name: /^RON\s+17\.5$/})).toBeInTheDocument();
    expect(oatRow.getByText("Edited")).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "1 L"})).toBeInTheDocument();
    expect(oats.quantity).toBe(2);

    fireEvent.click(oatRow.getByRole("cell", {name: "5 kg"}));
    const draft = oatRow.getByRole("spinbutton", {name: "Edit Quantity for Oats"});
    fireEvent.change(draft, {target: {value: "9"}});
    fireEvent.keyDown(draft, {key: "Escape"});

    expect(oatRow.getByRole("cell", {name: "5 kg"})).toBeInTheDocument();
    expect(oatRow.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("keeps selected rows on cancel and removes only those rows after confirmation", async () => {
    const items = ["Oats", "Milk", "Rice"].map((name) => buildProduct({name}));
    renderItems(buildInvoice({items}));
    fireEvent.click(screen.getByRole("checkbox", {name: "Select Oats"}));
    fireEvent.click(screen.getByRole("checkbox", {name: "Select Rice"}));
    const deleteSelected = screen.getByRole("button", {name: "Delete Selected"});

    fireEvent.click(deleteSelected);
    const confirmDialog = () => within(screen.getByRole("alertdialog", {name: "Delete Items"}));
    expect(confirmDialog().getByText("Are you sure you want to delete 2 items?")).toBeInTheDocument();
    fireEvent.click(confirmDialog().getByRole("button", {name: "Cancel"}));

    expect(screen.getByRole("checkbox", {name: "Select Oats"})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Select Rice"})).toBeChecked();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    fireEvent.click(deleteSelected);
    fireEvent.click(confirmDialog().getByRole("button", {name: "Delete"}));

    expect(screen.queryByRole("cell", {name: "Oats"})).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", {name: "Rice"})).not.toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Milk"})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Delete Selected"})).not.toBeInTheDocument();
  });

  it("does not treat a locally renamed row as the persisted row with that name", async () => {
    renderItems(buildInvoice({items: [buildProduct({name: "Oats"}), buildProduct({name: "Milk"})]}));
    fireEvent.click(screen.getByRole("checkbox", {name: "Select Milk"}));
    fireEvent.click(screen.getByRole("button", {name: "Delete Selected"}));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", {name: "Delete"}));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Oats"));
    const input = screen.getByRole("textbox", {name: "Edit Name for Oats"});
    fireEvent.change(input, {target: {value: "Milk"}});
    fireEvent.keyDown(input, {key: "Enter"});

    const renamed = within(screen.getByRole("row", {name: /Select Milk/}));
    expect(renamed.getByText("Milk")).toBeInTheDocument();
    expect(renamed.queryByRole("button", {name: "Product category: Milk"})).not.toBeInTheDocument();
  });

  it("shows a refreshed saved category without discarding a local quantity edit", () => {
    const milk = buildProduct({name: "Milk", quantity: 2, quantityUnit: "L", category: null});
    const invoice = buildInvoice({items: [milk]});
    const {rerender} = renderItems(invoice);
    fireEvent.click(screen.getByRole("cell", {name: "2 L"}));
    const quantity = screen.getByRole("spinbutton", {name: "Edit Quantity for Milk"});
    fireEvent.change(quantity, {target: {value: "5"}});
    fireEvent.keyDown(quantity, {key: "Enter"});

    rerender(<ItemsTable invoice={{...invoice, items: [{...milk, category: ProductCategory.Milk}]}} />);

    expect(screen.getByRole("button", {name: "Product category: Milk"})).toHaveTextContent("Milk");
    expect(screen.getByRole("cell", {name: "5 L"})).toBeInTheDocument();
  });
});
