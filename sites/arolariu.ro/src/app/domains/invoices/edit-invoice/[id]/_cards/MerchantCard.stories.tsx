import type {Meta, StoryObj} from "@storybook/react";
import MerchantCard from "./MerchantCard";
import {storyMerchant, WithInvoiceDialogs} from "../../../_storybook";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs`.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/MerchantCard",
  component: MerchantCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Merchant card with linked merchant data. */
export const LinkedMerchant: Story = {
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={storyMerchant} />
    </WithInvoiceDialogs>
  ),
};

/** Merchant card with no merchant linked (null). */
export const NoMerchant: Story = {
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={null} />
    </WithInvoiceDialogs>
  ),
};
