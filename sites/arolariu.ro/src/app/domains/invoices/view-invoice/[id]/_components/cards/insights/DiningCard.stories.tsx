import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, storyInvoice, storyProducts, WithViewInvoiceContext, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {DiningCard} from "./DiningCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * DiningCard displays dining-related insights from restaurant/fast-food invoices,
 * including estimated calories, cost per person, and dining tips. Reads the
 * active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/DiningCard",
  component: DiningCard,
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

/** Dining insights for a full multi-item receipt. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a small single-item, low-cost receipt. */
export const SingleDiner: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        items: storyProducts.slice(0, 1),
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 12.5},
      }}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};
