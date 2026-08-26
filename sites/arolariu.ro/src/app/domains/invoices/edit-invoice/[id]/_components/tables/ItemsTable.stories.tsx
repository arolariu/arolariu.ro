import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
import ItemsTable from "./ItemsTable";

/**
 * ItemsTable renders a paginated table of invoice line items with editing
 * capabilities.
 *
 * Requires `DialogProvider` because it dispatches the `EDIT_INVOICE__ITEMS`
 * dialog.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Tables/ItemsTable",
  component: ItemsTable,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ItemsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const invoiceWithItems: Invoice = generateRandomInvoice();

const invoiceWithoutItems: Invoice = {...generateRandomInvoice(), items: []};

/** Invoice with several line items. */
export const WithItems: Story = {
  args: {invoice: invoiceWithItems},
};

/** Invoice with no line items yet. */
export const Empty: Story = {
  args: {invoice: invoiceWithoutItems},
};
