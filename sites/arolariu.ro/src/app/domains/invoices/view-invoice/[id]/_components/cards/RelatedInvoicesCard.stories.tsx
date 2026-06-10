import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyInvoices, seedInvoiceStoryStores, resetInvoiceStoryStores} from "@/app/domains/invoices/_storybook";
import {InvoiceCategory} from "@/types/invoices";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";

const meta = {
  title: "Invoices/View Invoice/Cards/RelatedInvoicesCard",
  component: RelatedInvoicesCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Horizontal carousel card displaying related invoices based on merchant, category, or amount similarity.",
      },
    },
  },
  tags: ["autodocs"],
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
  parameters: { docs: { description: { story: "No related invoices found - component returns null." } } },
};

export const SameMerchant: Story = {
  render: () => {
    const merchantId = "merchant-123";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId};
    const relatedInvoices = storyInvoices.slice(0, 3).map(inv => ({...inv, merchantReference: merchantId}));
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, ...relatedInvoices]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Carousel displaying 3 related invoices from the same merchant." } } },
};

export const SameCategory: Story = {
  render: () => {
    const currentInvoice = {...storyInvoice, category: InvoiceCategory.GROCERIES};
    const relatedInvoices = storyInvoices.slice(0, 4).map((inv, i) => ({
      ...inv,
      category: InvoiceCategory.GROCERIES,
      merchantReference: `merchant-${i}`,
    }));
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, ...relatedInvoices]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Carousel displaying 4 related invoices with the same category." } } },
};