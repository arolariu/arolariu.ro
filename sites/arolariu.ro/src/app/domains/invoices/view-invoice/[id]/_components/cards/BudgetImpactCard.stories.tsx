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
    docs: {
      description: {
        component:
          "Displays the monthly budget impact analysis for an invoice. Shows progress bar of budget usage, " +
          "daily allowance, remaining budget, and spending trends. Relies on InvoiceContext for invoice data " +
          "and computes analytics including percentage used, days remaining, and over-budget warnings. " +
          "Mounted with real component through story-specific InvoiceContext decorators.",
      },
    },
  },
} satisfies Meta<typeof BudgetImpactCard>;

export default meta;

type InvoiceStoryProps = {
  invoice: Invoice;
};
type Story = StoryObj<InvoiceStoryProps>;

/** Under budget — healthy spending. */
export const UnderBudget: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card showing healthy spending with low monthly budget usage. Displays remaining budget, " +
          "days left in month, and daily allowance with a neutral trend indicator for this fixture. Transaction from mid-January 2026.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 15), // January 15, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 125.5,
          totalTaxAmount: 15.5,
          subtotalAmount: 110.0,
          tipAmount: 0,
        })
        .build();
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
};

/** Over budget — warning state. */
export const OverBudget: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card in over-budget warning state with high monthly budget usage. Displays absolute value of " +
          "remaining balance with over-budget label, over-budget alert styling, and hides daily allowance (not applicable when over budget). Transaction from late December 2025.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2025, 11, 26), // December 26, 2025
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 2800.0,
          totalTaxAmount: 280.0,
          subtotalAmount: 2520.0,
          tipAmount: 0,
        })
        .build();
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
};

/** Near the monthly budget limit — high but not over. */
export const NearLimit: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card with spending close to the monthly budget limit. Shows a near-full progress bar and a small " +
          "remaining balance with a warning-leaning trend, mid-month transaction.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 12), // January 12, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 1450.0,
          totalTaxAmount: 145.0,
          subtotalAmount: 1305.0,
          tipAmount: 0,
        })
        .build();
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
};
