import {
  invoicePresets,
  storyEurInvoice,
  storyGbpInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyUsdInvoice,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {GeneralExpenseCard} from "./GeneralExpenseCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * GeneralExpenseCard shows a general-purpose expense breakdown with auto-detected
 * category, budget categories, and tax options. Reads the active invoice from
 * `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Invoice/GeneralExpenseCard",
  component: GeneralExpenseCard,
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

/** General expense insights for a standard-value receipt. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a high-value purchase. */
export const HighValue: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 2499.99},
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a low-value receipt (under $5). */
export const LowValue: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 3.49},
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a zero-cost invoice (free sample or void). */
export const ZeroCost: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 0},
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for an invoice with long name and description. */
export const LongText: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLongNameInvoice}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a EUR-denominated receipt. */
export const EuroCurrency: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyEurInvoice,
        paymentInformation: {
          ...storyEurInvoice.paymentInformation,
          totalCostAmount: 89.99,
        },
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a USD-denominated receipt. */
export const UsdCurrency: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyUsdInvoice,
        paymentInformation: {
          ...storyUsdInvoice.paymentInformation,
          totalCostAmount: 125.49,
        },
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a GBP-denominated receipt. */
export const GbpCurrency: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyGbpInvoice,
        paymentInformation: {
          ...storyGbpInvoice.paymentInformation,
          totalCostAmount: 67.5,
        },
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for an extremely high-value enterprise purchase. */
export const HugeTotal: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 99999.99},
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};
