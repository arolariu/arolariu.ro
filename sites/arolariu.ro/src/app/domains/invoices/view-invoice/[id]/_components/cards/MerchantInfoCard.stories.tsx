import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoices,
  storyLongNameMerchant,
  storyMerchant,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {MerchantInfoCard} from "./MerchantInfoCard";

/**
 * MerchantInfoCard shows merchant details and analytics from `useInvoiceContext`
 * and `useInvoicesStore`. Mounts the real component inside the real view-invoice
 * context with a seeded invoices store.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Merchant/MerchantInfo",
  component: MerchantInfoCard,
  parameters: {layout: "centered"},
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
} satisfies Meta<typeof MerchantInfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full merchant info with website and analytics. */
export const WithWebsite: Story = {
  render: () => (
    <WithViewInvoiceContext merchant={storyMerchant}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};

/** Merchant whose name is very long — exercises truncation/wrapping. */
export const LongMerchantName: Story = {
  render: () => (
    <WithViewInvoiceContext merchant={storyLongNameMerchant}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};

/** No merchant resolved — empty/fallback state. */
export const WithoutMerchant: Story = {
  render: () => (
    <WithViewInvoiceContext merchant={null}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};

/** Merchant with minimal data — no website, no description. */
export const MinimalMerchantData: Story = {
  render: () => (
    <WithViewInvoiceContext merchant={{...storyMerchant, website: "", description: ""}}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};

/** Merchant with very long description. */
export const LongDescription: Story = {
  render: () => (
    <WithViewInvoiceContext
      merchant={{
        ...storyMerchant,
        description:
          "This is an intentionally very long merchant description that spans multiple lines to verify text wrapping, clamping, and ellipsis behavior in the merchant info card. The description continues to test layout stability and responsive text handling across different viewport sizes and themes.",
      }}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};

/** Merchant with very long website URL. */
export const LongWebsiteUrl: Story = {
  render: () => (
    <WithViewInvoiceContext
      merchant={{
        ...storyMerchant,
        website:
          "https://www.corner-shop-abc-international-wholesale-and-retail-distribution-center-bucuresti-militari-branch-42.ro/shop/products/categories/groceries/organic",
      }}>
      <MerchantInfoCard />
    </WithViewInvoiceContext>
  ),
};
