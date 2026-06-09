import type {Meta, StoryObj} from "@storybook/react";
import MerchantCard from "./MerchantCard";
import {storyMerchant} from "../../../_storybook/fixtures/merchantFixtures";
import {DialogProvider} from "../../../_contexts/DialogContext";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * This story mounts the real component wrapped in DialogProvider.
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
    <DialogProvider>
      <MerchantCard merchant={storyMerchant} />
    </DialogProvider>
  ),
};

/** Merchant card with no merchant linked (null). */
export const NoMerchant: Story = {
  render: () => (
    <DialogProvider>
      <MerchantCard merchant={null} />
    </DialogProvider>
  ),
};
