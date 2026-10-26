import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import type {Invoice, Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {EditInvoiceContextProvider, useEditInvoiceContext} from "../_context/EditInvoiceContext";
import InvoiceHeader from "./InvoiceHeader";

/**
 * InvoiceHeader (edit) renders the editable invoice header with inline name
 * editing, save, discard, print, and delete controls.
 *
 * Requires `EditInvoiceContextProvider` (name editing, pending-change
 * tracking) and `DialogProvider` (delete + analyze dialogs). Each story
 * supplies its own provider decorator (rather than a shared meta-level
 * decorator) so different invoice fixtures never nest two competing
 * providers of the same context.
 */
const mockInvoiceWithItems = generateRandomInvoice();
const mockInvoiceNoItems: Invoice = {...generateRandomInvoice(), items: []};
const mockMerchant = generateRandomMerchant();

function withInvoiceHeaderProviders(invoice: Invoice, merchant: Merchant | null) {
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
  title: "Invoices/EditInvoice/InvoiceHeader",
  component: InvoiceHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof InvoiceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No pending changes — save/discard buttons are hidden. */
export const NoChanges: Story = {
  decorators: [withInvoiceHeaderProviders(mockInvoiceWithItems, mockMerchant)],
};

/** Invoice with no items yet — the "Analyze with AI" button appears. */
export const AnalyzableInvoice: Story = {
  decorators: [withInvoiceHeaderProviders(mockInvoiceNoItems, mockMerchant)],
};

/** Renders `InvoiceHeader` and edits the name field once mounted so save/discard appear. */
function InvoiceHeaderWithPendingNameChange(): React.JSX.Element {
  const {setName} = useEditInvoiceContext();

  useEffect(() => {
    setName(`${mockInvoiceWithItems.name} (edited)`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to seed a pending change
  }, []);

  return <InvoiceHeader />;
}

/** Pending name change — save/discard buttons appear. */
export const WithPendingChanges: Story = {
  decorators: [withInvoiceHeaderProviders(mockInvoiceWithItems, mockMerchant)],
  render: () => <InvoiceHeaderWithPendingNameChange />,
};
