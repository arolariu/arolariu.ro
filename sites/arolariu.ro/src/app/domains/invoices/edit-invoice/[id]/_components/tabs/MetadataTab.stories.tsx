import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import type {Meta, StoryObj} from "@storybook/react";
import MetadataTab from "./MetadataTab";

/**
 * MetadataTab displays key-value metadata pairs for an invoice with
 * add, edit, and delete capabilities. Depends on `useDialog`.
 */
const meta = {
  title: "Invoices/EditInvoice/Tabs/MetadataTab",
  component: MetadataTab,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div style={{minWidth: "600px"}}>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof MetadataTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Metadata tab with sample key-value pairs. */
export const WithMetadata: Story = {
  args: {
    metadata: {
      store_id: "KFL-2024-BUC",
      receipt_number: "INV-2024-001234",
      cashier: "Station 3",
      loyalty_points: "150",
      payment_method: "VISA-4242",
    },
  },
};

/** Empty metadata tab showing empty state. */
export const Empty: Story = {
  args: {
    metadata: {},
  },
};
