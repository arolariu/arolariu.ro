import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoice,
  storyInvoices,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import {InvoiceCategory} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {CategoryInsightsCardContainer} from "./CategoryInsightsCardContainer";

/**
 * CategoryInsightsCardContainer renders a category-specific insight card based on
 * the current invoice's category from `useInvoiceContext`. Mounts the real
 * component; each story selects a different category branch.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/CategoryInsightsContainer",
  component: CategoryInsightsCardContainer,
  parameters: {layout: "centered"},
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores({invoices: storyInvoices});
      return <Story />;
    },
  ],
} satisfies Meta<typeof CategoryInsightsCardContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grocery category → NutritionCard branch. */
export const Grocery: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.GROCERY}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};

/** Undefined category → CategorySuggestionCard branch. */
export const NotDefined: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.NOT_DEFINED}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};

/** Car/Auto category → VehicleCard branch. */
export const CarAuto: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.CAR_AUTO}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};

/** Fast-food category → DiningCard branch. */
export const FastFood: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.FAST_FOOD}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};

/** Home cleaning category → HomeInventoryCard branch. */
export const HomeCleaning: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.HOME_CLEANING}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};

/** Other category → general fallback (no specific card). */
export const Other: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, category: InvoiceCategory.OTHER}}>
      <CategoryInsightsCardContainer />
    </WithViewInvoiceContext>
  ),
};
