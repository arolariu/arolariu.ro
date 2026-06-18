import {
  invoicePresets,
  storyEmptyInvoice,
  storyEurInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyLowConfidenceInvoice,
  storyManyAllergensInvoice,
  storyProducts,
  storyZeroTotalInvoice,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice, Product} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
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
  render: ({invoice}) => {
    const oneItem: Product[] = storyProducts.slice(0, 1);
    return (
      <WithViewInvoiceContext
        invoice={{
          ...invoice,
          items: oneItem,
          paymentInformation: {...invoice.paymentInformation, totalCostAmount: 12.5},
        }}>
        <DiningCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Dining insights for an empty receipt (no items). */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyEmptyInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a huge receipt with many items. */
export const HugeReceipt: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyHugeInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a high-cost multi-diner group meal. */
export const GroupDining: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 450.0},
      }}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a zero-cost receipt (voucher, comp, or free sample). */
export const ZeroCost: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyZeroTotalInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a EUR-denominated restaurant receipt. */
export const EuroDining: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyEurInvoice,
        paymentInformation: {...storyEurInvoice.paymentInformation, totalCostAmount: 78.5},
      }}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a low-confidence OCR extraction (blurry receipt). */
export const LowConfidence: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLowConfidenceInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a receipt with many allergen-heavy items. */
export const ManyAllergens: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyManyAllergensInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a high-value multi-course fine dining receipt. */
export const FineDining: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, totalCostAmount: 890.0},
      }}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};
