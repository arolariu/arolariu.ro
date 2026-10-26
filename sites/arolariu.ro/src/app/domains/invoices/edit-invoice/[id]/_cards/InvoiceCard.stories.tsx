import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Invoice, Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {EditInvoiceContextProvider} from "../_context/EditInvoiceContext";
import InvoiceCard from "./InvoiceCard";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * Requires `EditInvoiceContextProvider` (invoice + merchant + pending-change
 * tracking) and `DialogProvider` (the nested `ItemsTable` opens `EDIT_INVOICE__ITEMS`).
 * Each story supplies its own provider decorator (rather than a shared
 * meta-level decorator) so different invoice fixtures never nest two
 * competing providers of the same context.
 */
const mockInvoice = generateRandomInvoice();

function withInvoiceCardProviders(invoice: Invoice, merchant: Merchant | null) {
  return (Story: React.ComponentType): React.JSX.Element => (
    <DialogProvider>
      <EditInvoiceContextProvider
        invoice={invoice}
        merchant={merchant}>
        <Story />
      </EditInvoiceContextProvider>
    </DialogProvider>
  );
}

const meta = {
  title: "Invoices/EditInvoice/Cards/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoice card bound to a merchant. */
export const Default: Story = {
  decorators: [withInvoiceCardProviders(mockInvoice, generateRandomMerchant())],
};

/** Invoice card when no merchant is linked. */
export const NoMerchantLinked: Story = {
  decorators: [withInvoiceCardProviders(mockInvoice, null)],
};
