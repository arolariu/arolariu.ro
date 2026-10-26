import {generateRandomMerchant, InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel, type Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {InvoiceDetailsCard} from "./InvoiceDetailsCard";

/**
 * InvoiceDetailsCard displays the full invoice summary: date, category,
 * payment method, total, and a paginated items table. Reads the invoice and
 * merchant via `useInvoiceContext`, so every story mounts the real component
 * inside the real `InvoiceContextProvider` re-exported from
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
  title: "Invoices/ViewInvoice/Cards/InvoiceDetails",
  component: InvoiceDetailsCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full invoice details preview with a single allergen-flagged item. */
export const Preview: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withItems([
          {
            ...new ProductBuilder().withName("Organic Milk 2L").withPrice(3.99).withQuantity(2).build(),
            allergenAssessment: {
              status: AllergenAssessmentStatus.Detected,
              signals: [
                {
                  code: AllergenCode.Milk,
                  evidenceLevel: AllergenEvidenceLevel.Explicit,
                  confidence: 0.97,
                  evidence: [{source: "productLabel", value: "contains milk"}],
                },
              ],
            },
          },
          new ProductBuilder().withName("Fresh Salmon Fillet").withPrice(24.99).withQuantity(0.5).withQuantityUnit("kg").build(),
        ])
        .build(),
    ),
  ],
};

/** Invoice with 20+ items to test pagination. */
export const ManyItems: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withRandomItems(22).build())],
};

/** Invoice with no items — empty items table. */
export const EmptyItems: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withItems([]).build())],
};

/** Invoice with exactly one item — minimal line item display. */
export const SingleItem: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder().withItems([new ProductBuilder().withName("Espresso Coffee").withPrice(2.5).withQuantity(1).build()]).build(),
    ),
  ],
};
