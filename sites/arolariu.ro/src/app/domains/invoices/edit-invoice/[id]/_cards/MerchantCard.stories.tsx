import type {Merchant} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {storyMerchant, storyOnlineMerchant, WithInvoiceDialogs} from "../../../_storybook";
import MerchantCard from "./MerchantCard";

type StoryArgs = {merchant: Merchant | null; merchantPreset: "physical" | "online" | "none"};

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs`.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Merchant/MerchantCard",
  component: MerchantCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    merchantPreset: {control: "select", options: ["physical", "online", "none"]},
    merchant: {control: "object"},
  },
  args: {merchantPreset: "physical", merchant: storyMerchant},
  decorators: [
    (Story, context) => {
      const preset = context.args.merchantPreset as "physical" | "online" | "none";
      if (preset === "none") {
        context.args.merchant = null;
      } else if (preset === "physical" && context.args.merchant !== storyMerchant) {
        context.args.merchant = storyMerchant;
      } else if (preset === "online" && context.args.merchant !== storyOnlineMerchant) {
        context.args.merchant = storyOnlineMerchant;
      }
      return <Story />;
    },
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Merchant card with linked merchant data. */
export const LinkedMerchant: Story = {
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={merchant} />
    </WithInvoiceDialogs>
  ),
};

/** Merchant card with no merchant linked (null). */
export const NoMerchant: Story = {
  args: {merchantPreset: "none", merchant: null},
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={merchant} />
    </WithInvoiceDialogs>
  ),
};

/** Online-only merchant (no physical store address). */
export const OnlineMerchant: Story = {
  args: {merchantPreset: "online", merchant: storyOnlineMerchant},
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard merchant={merchant} />
    </WithInvoiceDialogs>
  ),
};

/** Merchant with a very long name and description to exercise text overflow. */
export const LongText: Story = {
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard
        merchant={
          merchant
            ? {
                ...merchant,
                name: "Corner Shop ABC International Wholesale & Retail Distribution Center Bucuresti Militari Branch",
                description:
                  "A very long merchant description used to validate truncation, wrapping, and layout stability inside the merchant card across themes and locales.",
              }
            : null
        }
      />
    </WithInvoiceDialogs>
  ),
};

/** Merchant with minimal data — no description or optional fields. */
export const MinimalData: Story = {
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard
        merchant={
          merchant
            ? ({
                ...merchant,
                description: "",
                website: "",
              } as Merchant)
            : null
        }
      />
    </WithInvoiceDialogs>
  ),
};

/** Merchant with very long website URL. */
export const LongWebsiteUrl: Story = {
  render: ({merchant}) => (
    <WithInvoiceDialogs>
      <MerchantCard
        merchant={
          merchant
            ? ({
                ...merchant,
                website:
                  "https://www.corner-shop-abc-international-wholesale-and-retail-distribution-center-bucuresti-militari-branch.ro/shop/products/categories/groceries",
              } as Merchant)
            : null
        }
      />
    </WithInvoiceDialogs>
  ),
};
