import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyPublicInvoice, storyOnlineInvoice, seedInvoiceStoryStores, resetInvoiceStoryStores} from "@/app/domains/invoices/_storybook";
import {InvoiceCategory} from "@/types/invoices";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";

const meta = {
  title: "Invoices/View Invoice/Cards/RelatedInvoicesCard",
  component: RelatedInvoicesCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Horizontal carousel card displaying related invoices based on merchant, category, or amount similarity. **Note:** These stories seed global invoice store state and are intended for isolated canvas viewing to prevent cross-story contamination.",
      },
    },
  },
} satisfies Meta<typeof RelatedInvoicesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoRelated: Story = {
  render: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [storyInvoice]});
    return (
      <WithViewInvoiceContext invoice={storyInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "No related invoices found - component returns null (only current invoice in store)." } } },
};

export const SameMerchant: Story = {
  render: () => {
    const merchantId = "merchant-123";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current Invoice"};
    const related1 = {...storyPublicInvoice, merchantReference: merchantId, name: "Related Invoice 1"};
    const related2 = {...storyOnlineInvoice, merchantReference: merchantId, name: "Related Invoice 2"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Carousel displaying 2 related invoices from the same merchant (current invoice filtered out)." } } },
};

export const SameCategory: Story = {
  render: () => {
    const currentInvoice = {...storyInvoice, category: InvoiceCategory.GROCERY, name: "Current Grocery Invoice"};
    const related1 = {...storyPublicInvoice, category: InvoiceCategory.GROCERY, merchantReference: "merchant-diff-1", name: "Grocery Invoice 1"};
    const related2 = {...storyOnlineInvoice, category: InvoiceCategory.GROCERY, merchantReference: "merchant-diff-2", name: "Grocery Invoice 2"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Carousel displaying 2 related invoices with the same category (current invoice filtered out)." } } },
};

export const MixedRelationships: Story = {
  render: () => {
    const merchantId = "merchant-xyz";
    const currentInvoice = {
      ...storyInvoice,
      merchantReference: merchantId,
      category: InvoiceCategory.GROCERY,
      paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 150.0},
      name: "Current Invoice",
    };
    const sameMerchant = {...storyPublicInvoice, merchantReference: merchantId, category: InvoiceCategory.NOT_DEFINED, name: "Same Merchant"};
    const sameCategory = {...storyOnlineInvoice, merchantReference: "different-merchant", category: InvoiceCategory.GROCERY, name: "Same Category"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, sameMerchant, sameCategory]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Displays 2 related invoices: one by same merchant (priority 1), one by same category (priority 2)." } } },
};