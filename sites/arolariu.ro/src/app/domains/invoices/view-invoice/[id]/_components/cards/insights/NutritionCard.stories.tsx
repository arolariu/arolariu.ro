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
import {NutritionCard} from "./NutritionCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * NutritionCard displays nutritional insights from grocery invoice items,
 * showing food group breakdowns, balance scores, and dietary suggestions.
 * Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/NutritionCard",
  component: NutritionCard,
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

/** Nutrition insights for a full grocery basket. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a small basket with only a couple of items. */
export const FewItems: Story = {
  render: ({invoice}) => {
    const twoItems: Product[] = storyProducts.slice(0, 2);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: twoItems}}>
        <NutritionCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Nutrition insights for an empty basket (no items). */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyEmptyInvoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a huge grocery basket with 120+ items. */
export const HugeBasket: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyHugeInvoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a single-item purchase. */
export const SingleItem: Story = {
  render: ({invoice}) => {
    const oneItem: Product[] = storyProducts.slice(0, 1);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: oneItem}}>
        <NutritionCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Nutrition insights for an invoice with many allergen-heavy items. */
export const ManyAllergens: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyManyAllergensInvoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a low-confidence OCR extraction (smudged receipt). */
export const LowConfidence: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLowConfidenceInvoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a EUR-denominated grocery basket. */
export const EuroBasket: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyEurInvoice,
        items: storyProducts,
      }}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a zero-cost basket (free samples, promos). */
export const ZeroCost: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyZeroTotalInvoice,
        items: storyProducts,
      }}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a mid-size balanced grocery basket. */
export const BalancedBasket: Story = {
  render: ({invoice}) => {
    const balancedItems: Product[] = storyProducts.slice(0, 10);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: balancedItems}}>
        <NutritionCard />
      </WithViewInvoiceContext>
    );
  },
};
