import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoice,
  storyInvoices,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {SeasonalInsightsCard} from "./SeasonalInsightsCard";

/**
 * SeasonalInsightsCard derives month-over-month spending insights from
 * `useInvoiceContext` and `useInvoicesStore`. Mounts the real component with a
 * seeded invoices store.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/SeasonalInsights",
  component: SeasonalInsightsCard,
  parameters: {layout: "centered"},
} satisfies Meta<typeof SeasonalInsightsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rich history — multiple invoices seeded so insights compute. */
export const WithHistory: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <SeasonalInsightsCard />
    </WithViewInvoiceContext>
  ),
};

/** Insufficient data — only the current invoice, so the placeholder shows. */
export const InsufficientData: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({invoices: [storyInvoice]});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <SeasonalInsightsCard />
    </WithViewInvoiceContext>
  ),
};

/** Many invoices seeded — rich insights with multiple data points. */
export const RichHistory: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      const manyInvoices = Array.from({length: 30}, (_, i) => ({
        ...storyInvoice,
        id: `invoice-${i}`,
        name: `Invoice ${i + 1}`,
        paymentInformation: {
          ...storyInvoice.paymentInformation,
          transactionDate: new Date(2024, 2, i + 1),
          totalCostAmount: Number((50 + i * 10 + Math.random() * 20).toFixed(2)),
        },
      }));
      seedInvoiceStoryStores({invoices: manyInvoices});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <SeasonalInsightsCard />
    </WithViewInvoiceContext>
  ),
};

/** Empty store — no invoices. */
export const EmptyStore: Story = {
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({invoices: []});
      return <Story />;
    },
  ],
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <SeasonalInsightsCard />
    </WithViewInvoiceContext>
  ),
};
