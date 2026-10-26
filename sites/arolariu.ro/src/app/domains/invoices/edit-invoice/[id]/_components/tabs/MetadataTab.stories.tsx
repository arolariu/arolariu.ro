import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
import MetadataTab from "./MetadataTab";

/**
 * MetadataTab displays key-value metadata pairs for an invoice with
 * add, edit, and delete capabilities.
 *
 * Requires `DialogProvider` because it dispatches the `EDIT_INVOICE__METADATA`
 * dialog in add/edit/delete modes.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Tabs/MetadataTab",
  component: MetadataTab,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MetadataTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Metadata tab with sample key-value pairs, including readonly fields. */
export const WithMetadata: Story = {
  args: {
    metadata: {
      storeLocation: "KFL-2024-BUC",
      receiptNumber: "INV-2024-001234",
      cashier: "Station 3",
      taxAmount: "12.40",
    },
  },
};

/** Metadata tab with no entries yet. */
export const Empty: Story = {
  args: {metadata: {}},
};
