import {generateRandomMerchant, InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel, type Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {NutritionCard} from "./NutritionCard";

/**
 * NutritionCard shows EU-14 structured allergen assessments for each invoice product.
 * The food-grouping subsection (food groups, basket composition, balance score)
 * has been removed (Decision D5).
 *
 * Reads the invoice via `useInvoiceContext`, so every story mounts the real
 * component inside the real `InvoiceContextProvider` re-exported from
 * `.storybook/providers`.
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
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  component: NutritionCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof NutritionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Products spanning detected, no-signals, insufficient-data, and unassessed allergen states. */
export const MixedAssessments: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withItems([
          {
            ...new ProductBuilder().withName("Milk 2% 1L").build(),
            allergenAssessment: {
              status: AllergenAssessmentStatus.Detected,
              signals: [
                {
                  code: AllergenCode.Milk,
                  evidenceLevel: AllergenEvidenceLevel.Explicit,
                  confidence: 0.95,
                  evidence: [{source: "productLabel", value: "contains milk"}],
                },
              ],
            },
          },
          {
            ...new ProductBuilder().withName("Whole Wheat Bread").build(),
            allergenAssessment: {
              status: AllergenAssessmentStatus.Detected,
              signals: [
                {
                  code: AllergenCode.CerealsContainingGluten,
                  evidenceLevel: AllergenEvidenceLevel.Explicit,
                  confidence: 0.99,
                  evidence: [{source: "productLabel", value: "contains wheat"}],
                },
              ],
            },
          },
          {
            ...new ProductBuilder().withName("Mineral Water").build(),
            allergenAssessment: {status: AllergenAssessmentStatus.NoSignals, signals: []},
          },
          {
            ...new ProductBuilder().withName("Unknown Sauce").build(),
            allergenAssessment: {status: AllergenAssessmentStatus.InsufficientData, signals: []},
          },
          {
            ...new ProductBuilder().withName("Coffee Beans").build(),
            allergenAssessment: null,
          },
        ])
        .build(),
    ),
  ],
};

/** No products on the invoice — empty state. */
export const NoProducts: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withItems([]).build())],
};
