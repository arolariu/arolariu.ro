import {
  invoicePresets,
  storyEmptyInvoice,
  storyEurInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyLargeTotalInvoice,
  storyLowConfidenceInvoice,
  storyProducts,
  storyZeroTotalInvoice,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice, Product} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {HomeInventoryCard} from "./HomeInventoryCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * HomeInventoryCard estimates household supply levels and restock timing from
 * grocery items. Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/HomeInventoryCard",
  component: HomeInventoryCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Home inventory insights for a full grocery basket. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a small top-up shop. */
export const FewItems: Story = {
  render: ({invoice}) => {
    const twoItems: Product[] = storyProducts.slice(0, 2);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: twoItems}}>
        <HomeInventoryCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Home inventory insights for an empty basket (no items). */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyEmptyInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a huge bulk grocery order. */
export const BulkOrder: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyHugeInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a single-item purchase. */
export const SingleItem: Story = {
  render: ({invoice}) => {
    const oneItem: Product[] = storyProducts.slice(0, 1);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: oneItem}}>
        <HomeInventoryCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Home inventory insights for an extremely expensive household stock-up. */
export const HugeTotal: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLargeTotalInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a zero-cost receipt (free samples, returns). */
export const ZeroCost: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyZeroTotalInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a EUR-denominated grocery receipt. */
export const EuroGrocery: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyEurInvoice,
        items: storyProducts,
      }}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a low-confidence OCR extraction (damaged receipt). */
export const LowConfidence: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLowConfidenceInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a mid-size weekly shop. */
export const WeeklyShop: Story = {
  render: ({invoice}) => {
    const mediumBasket: Product[] = storyProducts.slice(0, 12);
    return (
      <WithViewInvoiceContext
        invoice={{
          ...invoice,
          items: mediumBasket,
          paymentInformation: {...invoice.paymentInformation, totalCostAmount: 145.75},
        }}>
        <HomeInventoryCard />
      </WithViewInvoiceContext>
    );
  },
};
