import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {BudgetImpactCard} from "./BudgetImpactCard";

/**
 * BudgetImpactCard shows the monthly budget impact of an invoice including
 * progress bar, daily allowance, and remaining budget. Reads the invoice via
 * `useInvoiceContext`, so every story mounts the real component inside the
 * real `InvoiceContextProvider` re-exported from `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

/** Builds a decorator that supplies a specific invoice through the real InvoiceContext. */
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
  title: "Invoices/ViewInvoice/Cards/BudgetImpact",
  component: BudgetImpactCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof BudgetImpactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under budget — invoice spend keeps the monthly total comfortably below the simulated $2,000 budget. */
export const UnderBudget: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withPaymentAmount(100)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date(2025, 0, 15))
        .build(),
    ),
  ],
};

/** Over budget — invoice spend pushes the monthly total past the simulated $2,000 budget. */
export const OverBudget: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withPaymentAmount(1200)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date(2025, 11, 20))
        .build(),
    ),
  ],
};
