import {invoicePresets, storyInvoice, withEntityPreset, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
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
