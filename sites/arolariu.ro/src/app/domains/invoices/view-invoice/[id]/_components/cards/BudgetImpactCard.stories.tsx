import {InvoiceBuilder} from "@/data/mocks/invoice";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {BudgetImpactCard} from "./BudgetImpactCard";

/**
 * BudgetImpactCard shows the monthly budget impact of an invoice including
 * progress bar, daily allowance, and remaining budget. Depends on `useInvoiceContext`.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/BudgetImpact",
  component: BudgetImpactCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, {args}) => {
      const invoice = args.invoice as Invoice;
      return (
        <InvoiceContextProvider
          invoice={invoice}
          merchant={null}>
          <div style={{minWidth: "400px"}}>
            <Story />
          </div>
        </InvoiceContextProvider>
      );
    },
  ],
} satisfies Meta<typeof BudgetImpactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under budget — healthy spending. */
export const UnderBudget: Story = {
  args: {
    invoice: new InvoiceBuilder()
      .withPaymentInformation({
        totalAmount: 125.5,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
        date: new Date(2026, 0, 15), // January 15, 2026
        type: "CARD" as const,
      })
      .build(),
  },
};

/** Over budget — warning state. */
export const OverBudget: Story = {
  args: {
    invoice: new InvoiceBuilder()
      .withPaymentInformation({
        totalAmount: 2800.0,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
        date: new Date(2025, 11, 26), // December 26, 2025
        type: "CARD" as const,
      })
      .build(),
  },
};
