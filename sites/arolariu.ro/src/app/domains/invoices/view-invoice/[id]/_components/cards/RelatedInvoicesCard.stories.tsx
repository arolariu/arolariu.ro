/**
 * @fileoverview Storybook stories for RelatedInvoicesCard component.
 * @module domains/invoices/view-invoice/[id]/components/cards/RelatedInvoicesCard.stories
 */

import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import {useInvoicesStore} from "@/stores";
import type {Meta, StoryObj} from "@storybook/react";
import * as InvoiceContext from "../../_context/InvoiceContext";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";

const meta = {
  title: "Domains/Invoices/ViewInvoice/Cards/RelatedInvoicesCard",
  component: RelatedInvoicesCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays related invoices in a horizontal scrollable carousel. "
          + "Related invoices are determined by: same merchant, same category, or similar amount (±30%).",
      },
    },
  },
  decorators: [
    (Story) => {
      const mockCurrentInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("current-invoice")
        .withName("Current Grocery Invoice")
        .withCategory(100) // GROCERY
        .withTotalAmount(150.0)
        .withMerchantIdentifier("merchant-1")
        .withIssuedDate("2024-03-15")
        .build();

      const mockMerchant = new MerchantBuilder().withMerchantIdentifier("merchant-1").withName("SuperMart Grocery").build();

      // Mock context
      vi.spyOn(InvoiceContext, "useInvoiceContext").mockReturnValue({
        invoice: mockCurrentInvoice,
        merchant: mockMerchant,
      });

      return <Story />;
    },
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof RelatedInvoicesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with mixed related invoices (same merchant, same category, similar amount).
 */
export const Default: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder()
          .withInvoiceIdentifier("current-invoice")
          .withName("Current Grocery Invoice")
          .withCategory(100)
          .withTotalAmount(150.0)
          .withMerchantIdentifier("merchant-1")
          .build(),
        // Same merchant
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-1")
          .withName("Weekly Grocery Shopping")
          .withMerchantIdentifier("merchant-1")
          .withTotalAmount(200.0)
          .withIssuedDate("2024-03-01")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-2")
          .withName("Weekend Grocery Run")
          .withMerchantIdentifier("merchant-1")
          .withTotalAmount(125.0)
          .withIssuedDate("2024-02-20")
          .build(),
        // Same category
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-3")
          .withName("Fresh Market Purchase")
          .withCategory(100)
          .withMerchantIdentifier("merchant-2")
          .withTotalAmount(300.0)
          .withIssuedDate("2024-03-10")
          .build(),
        // Similar amount
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-4")
          .withName("Fast Food Order")
          .withCategory(200) // FAST_FOOD
          .withMerchantIdentifier("merchant-3")
          .withTotalAmount(160.0)
          .withIssuedDate("2024-03-05")
          .build(),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
};

/**
 * Only same merchant invoices are related.
 */
export const SameMerchantOnly: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder()
          .withInvoiceIdentifier("current-invoice")
          .withName("Current Grocery Invoice")
          .withMerchantIdentifier("merchant-1")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-1")
          .withName("Previous Purchase #1")
          .withMerchantIdentifier("merchant-1")
          .withIssuedDate("2024-02-01")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-2")
          .withName("Previous Purchase #2")
          .withMerchantIdentifier("merchant-1")
          .withIssuedDate("2024-01-15")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-3")
          .withName("Previous Purchase #3")
          .withMerchantIdentifier("merchant-1")
          .withIssuedDate("2024-01-01")
          .build(),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
};

/**
 * Only same category invoices are related.
 */
export const SameCategoryOnly: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder()
          .withInvoiceIdentifier("current-invoice")
          .withCategory(100) // GROCERY
          .withMerchantIdentifier("merchant-1")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-1")
          .withName("Other Grocery Store")
          .withCategory(100)
          .withMerchantIdentifier("merchant-2")
          .withIssuedDate("2024-03-05")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-2")
          .withName("Supermarket Visit")
          .withCategory(100)
          .withMerchantIdentifier("merchant-3")
          .withIssuedDate("2024-02-28")
          .build(),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
};

/**
 * Only similar amount invoices are related.
 */
export const SimilarAmountOnly: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder()
          .withInvoiceIdentifier("current-invoice")
          .withTotalAmount(150.0)
          .withCategory(100)
          .withMerchantIdentifier("merchant-1")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-1")
          .withName("Similar Priced #1")
          .withTotalAmount(160.0)
          .withCategory(200)
          .withMerchantIdentifier("merchant-2")
          .build(),
        new InvoiceBuilder()
          .withInvoiceIdentifier("related-2")
          .withName("Similar Priced #2")
          .withTotalAmount(140.0)
          .withCategory(300)
          .withMerchantIdentifier("merchant-3")
          .build(),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
};

/**
 * Maximum of 6 related invoices displayed.
 */
export const MaximumSixInvoices: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder().withInvoiceIdentifier("current-invoice").withMerchantIdentifier("merchant-1").build(),
        ...Array.from({length: 10}, (_, i) =>
          new InvoiceBuilder()
            .withInvoiceIdentifier(`related-${i}`)
            .withName(`Related Invoice #${i + 1}`)
            .withMerchantIdentifier("merchant-1")
            .withIssuedDate(`2024-0${Math.floor(i / 3) + 1}-${(i % 30) + 1}`)
            .build(),
        ),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
};

/**
 * No related invoices found (component should not render).
 */
export const NoRelatedInvoices: Story = {
  decorators: [
    (Story) => {
      const invoices = [
        new InvoiceBuilder()
          .withInvoiceIdentifier("current-invoice")
          .withTotalAmount(150.0)
          .withCategory(100)
          .withMerchantIdentifier("merchant-1")
          .build(),
        // Completely different invoice (no relationship)
        new InvoiceBuilder()
          .withInvoiceIdentifier("unrelated")
          .withName("Unrelated Invoice")
          .withTotalAmount(5000.0) // Way outside ±30%
          .withCategory(400) // Different category
          .withMerchantIdentifier("merchant-99")
          .build(),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: "When no related invoices are found, the component returns null and doesn't render anything.",
      },
    },
  },
};

/**
 * Single invoice in store (only current invoice, no related).
 */
export const SingleInvoice: Story = {
  decorators: [
    (Story) => {
      const invoices = [new InvoiceBuilder().withInvoiceIdentifier("current-invoice").withName("Current Grocery Invoice").build()];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: "When there's only one invoice in the store, the component doesn't render.",
      },
    },
  },
};

/**
 * Mobile viewport demonstration.
 */
export const Mobile: Story = {
  ...Default,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "On mobile devices, the carousel is horizontally scrollable with touch support.",
      },
    },
  },
};
