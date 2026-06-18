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
