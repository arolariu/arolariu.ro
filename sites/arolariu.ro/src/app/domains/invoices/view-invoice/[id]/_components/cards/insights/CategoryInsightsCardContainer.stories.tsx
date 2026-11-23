import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {CategoryInsightsCardContainer} from "./CategoryInsightsCardContainer";

/**
 * CategoryInsightsCardContainer routes to the insight card matching the
 * invoice's selected category. Reads the invoice via
 * `useInvoiceContext`, so every story mounts the real component (and its
 * real routed child card) inside the real `InvoiceContextProvider`
 * re-exported from `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={mockMerchant}>
      <Story />
    </InvoiceContextProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/Insights/CategoryInsightsContainer",
  component: CategoryInsightsCardContainer,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CategoryInsightsCardContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Food division ("01") — routes to NutritionCard. */
export const GroceryCategory: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(InvoiceCategory.Groceries).withRandomItems(4).build())],
};

/** Restaurants division ("11") — routes to DiningCard. */
export const DiningCategory: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(InvoiceCategory.RestaurantDining).withRandomItems(3).build())],
};

/** Household division ("05") — routes to HomeInventoryCard. */
export const HouseholdCategory: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(InvoiceCategory.CleaningSupplies).withRandomItems(3).build())],
};

/** Transport division ("07") — routes to VehicleCard. */
export const VehicleCategory: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(InvoiceCategory.VehicleFuel).withPaymentAmount(280).build())],
};

/** Unclassified invoice — routes to CategorySuggestionCard. */
export const CategorySuggestion: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(null).build())],
};

/** Division with no dedicated card ("02" — alcohol/tobacco) — falls through to GeneralExpenseCard. */
export const GeneralExpense: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withCategory(InvoiceCategory.Other).build())],
};
