import {generateRandomMerchant, InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {ClassificationOrigin, ClassificationSystem, type Invoice, type StandardClassification} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../../.storybook/providers";
import {HomeInventoryCard} from "./HomeInventoryCard";

/**
 * HomeInventoryCard displays home inventory insights including supply stock
 * levels (for GS1 cleaning/hygiene classified items), eco-friendliness scores,
 * and bulk-buying suggestions. Reads the invoice via `useInvoiceContext`, so
 * every story mounts the real component inside the real
 * `InvoiceContextProvider` re-exported from `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

/** GS1 GPC classification for the cleaning/hygiene segment, matching the component's own detection logic. */
const cleaningHygieneClassification: StandardClassification = {
  system: ClassificationSystem.Gs1Gpc,
  code: "10000230",
  version: "2025.1",
  officialLabel: "Household Cleaning Products",
  hierarchy: [{level: "segment", code: "47000000", officialLabel: "Cleaning/Hygiene Products"}],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.92,
  evidence: [],
};

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
  title: "Invoices/ViewInvoice/Insights/HomeInventoryCard",
  component: HomeInventoryCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof HomeInventoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With cleaning/hygiene supplies detected — shows the stock-level list. */
export const WithSupplies: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withItems([
          new ProductBuilder().withName("Laundry Detergent").withClassification(cleaningHygieneClassification).build(),
          new ProductBuilder().withName("Dish Soap").withClassification(cleaningHygieneClassification).build(),
        ])
        .build(),
    ),
  ],
};

/** No cleaning/hygiene supplies detected — the stock-level section is omitted. */
export const NoSupplies: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withRandomItems(4).build())],
};
