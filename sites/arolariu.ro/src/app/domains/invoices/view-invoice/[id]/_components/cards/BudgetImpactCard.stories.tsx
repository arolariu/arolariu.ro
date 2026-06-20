import {invoicePresets, storyInvoice, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {InvoiceBuilder} from "@/data/mocks/invoice";
import type {Invoice} from "@/types/invoices";
import {PaymentType} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {BudgetImpactCard} from "./BudgetImpactCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * BudgetImpactCard shows the monthly budget impact of an invoice including
 * progress bar, daily allowance, and remaining budget. Depends on `useInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/BudgetImpact",
  component: BudgetImpactCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays the monthly budget impact analysis for an invoice. Shows progress bar of budget usage, "
          + "daily allowance, remaining budget, and spending trends. Relies on InvoiceContext for invoice data "
          + "and computes analytics including percentage used, days remaining, and over-budget warnings. "
          + "Mounted with real component through story-specific InvoiceContext decorators.",
      },
    },
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

/** Under budget — healthy spending. */
export const UnderBudget: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card showing healthy spending with low monthly budget usage. Displays remaining budget, "
          + "days left in month, and daily allowance with a neutral trend indicator for this fixture. Transaction from mid-January 2026.",
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
          "Budget impact card in over-budget warning state with high monthly budget usage. Displays absolute value of "
          + "remaining balance with over-budget label, over-budget alert styling, and hides daily allowance (not applicable when over budget). Transaction from late December 2025.",
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
          "Budget impact card with spending close to the monthly budget limit. Shows a near-full progress bar and a small "
          + "remaining balance with a warning-leaning trend, mid-month transaction.",
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

/** Very low spending — early in the month. */
export const VeryLowSpending: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card showing minimal spending early in the month. Displays high remaining budget and favorable daily allowance.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 3), // January 3, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 15.0,
          totalTaxAmount: 1.5,
          subtotalAmount: 13.5,
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

/** End of month transaction — few days remaining. */
export const EndOfMonth: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Budget impact card for a transaction near the end of the month. Shows only a few days remaining with adjusted daily allowance.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 29), // January 29, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 875.0,
          totalTaxAmount: 87.5,
          subtotalAmount: 787.5,
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

/** Start of month transaction — many days remaining. */
export const StartOfMonth: Story = {
  parameters: {
    docs: {
      description: {
        story: "Budget impact card for a transaction at the start of the month. Shows many days remaining with favorable daily allowance.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 2), // January 2, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 50.0,
          totalTaxAmount: 5.0,
          subtotalAmount: 45.0,
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

/** Mid-month transaction. */
export const MidMonth: Story = {
  parameters: {
    docs: {
      description: {
        story: "Budget impact card for a mid-month transaction. Shows typical monthly budget consumption at the halfway point.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 16), // January 16, 2026
          paymentType: PaymentType.Card,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 600.0,
          totalTaxAmount: 60.0,
          subtotalAmount: 540.0,
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

/** Cash payment type variant. */
export const CashPayment: Story = {
  parameters: {
    docs: {
      description: {
        story: "Budget impact card for a cash payment transaction (payment type 100).",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 10),
          paymentType: 100 as PaymentType,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          totalCostAmount: 200.0,
          totalTaxAmount: 20.0,
          subtotalAmount: 180.0,
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

/** EUR currency variant. */
export const EuroCurrency: Story = {
  parameters: {
    docs: {
      description: {
        story: "Budget impact card for a transaction in EUR currency.",
      },
    },
  },
  decorators: [
    (Story) => {
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(2026, 0, 14),
          paymentType: PaymentType.Card,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          totalCostAmount: 450.0,
          totalTaxAmount: 45.0,
          subtotalAmount: 405.0,
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
