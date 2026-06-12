import {InvoiceBuilder} from "@/data/mocks/invoice";
import {PaymentType} from "@/types/invoices";
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
        transactionDate: new Date(2026, 0, 15), // January 15, 2026
        paymentType: PaymentType.Card,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
        totalCostAmount: 125.5,
        totalTaxAmount: 15.5,
        subtotalAmount: 110.0,
        tipAmount: 0,
      })
      .build(),
  },
};

/** Over budget — warning state. */
export const OverBudget: Story = {
  args: {
    invoice: new InvoiceBuilder()
      .withPaymentInformation({
        transactionDate: new Date(2025, 11, 26), // December 26, 2025
        paymentType: PaymentType.Card,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
        totalCostAmount: 2800.0,
        totalTaxAmount: 280.0,
        subtotalAmount: 2520.0,
        tipAmount: 0,
      })
      .build(),
  },
};
