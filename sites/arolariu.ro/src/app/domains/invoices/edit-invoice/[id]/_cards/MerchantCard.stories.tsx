import type {Meta, StoryObj} from "@storybook/react";
import MerchantCard from "./MerchantCard";
import {storyMerchant, storyOnlineMerchant, WithInvoiceDialogs} from "../../../_storybook";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs`.
 */
const meta = {
  title: "arolariu.ro/IMS/EditInvoice/Cards/Merchant/MerchantCard",
  component: MerchantCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Merchant card with linked merchant data. */
export const LinkedMerchant: Story = {
  args: {
    merchant: storyMerchant,
  },
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={storyMerchant} />
    </WithInvoiceDialogs>
  ),
};

/** Merchant card with no merchant linked (null). */
export const NoMerchant: Story = {
  args: {
    merchant: null,
  },
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={null} />
    </WithInvoiceDialogs>
  ),
};

/** Online-only merchant (no physical store address). */
export const OnlineMerchant: Story = {
  args: {
    merchant: storyOnlineMerchant,
  },
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={storyOnlineMerchant} />
    </WithInvoiceDialogs>
  ),
};

/** Merchant with a very long name and description to exercise text overflow. */
export const LongText: Story = {
  args: {
    merchant: storyMerchant,
  },
  render: () => (
    <WithInvoiceDialogs>
      <MerchantCard
        merchant={{
          ...storyMerchant,
          name: "Corner Shop ABC International Wholesale & Retail Distribution Center Bucuresti Militari Branch",
          description:
            "A very long merchant description used to validate truncation, wrapping, and layout stability inside the merchant card across themes and locales.",
        }}
      />
    </WithInvoiceDialogs>
  ),
};
