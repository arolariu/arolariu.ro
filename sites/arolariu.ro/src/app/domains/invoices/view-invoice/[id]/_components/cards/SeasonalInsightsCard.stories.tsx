import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {SeasonalInsightsCard} from "./SeasonalInsightsCard";

/**
 * SeasonalInsightsCard detects and displays seasonal spending patterns and
 * provides actionable insights. Reads the invoice via `useInvoiceContext` and
 * historical invoices via the real `useInvoicesStore` (empty by default in
 * Storybook — this naturally exercises the "insufficient data" branch since
 * fewer than 2 cached invoices are available).
 */
const mockMerchant = generateRandomMerchant();

function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={mockMerchant}>
      <Story />
    </InvoiceContextProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/Cards/SeasonalInsights",
  component: SeasonalInsightsCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SeasonalInsightsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** December purchase — insufficient cached history to compare against (real empty `useInvoicesStore`). */
export const HolidaySeason: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withTransactionDate(new Date(2025, 11, 10))
        .withRandomItems(5)
        .build(),
    ),
  ],
};

/** Regular month purchase — same insufficient-data branch, different transaction month. */
export const RegularMonth: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withTransactionDate(new Date(2025, 5, 3))
        .withRandomItems(5)
        .build(),
    ),
  ],
};
