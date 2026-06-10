import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice} from "@/data/mocks";
import {InvoiceCategory} from "@/types/invoices";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {useInvoicesStore} from "@/stores";

/**
 * Related invoices card displaying similar invoices in a horizontal carousel.
 *
 * **Component Description:**
 * Displays a horizontal scrollable row of related invoices based on:
 * - Same Merchant: Invoices from the same merchant
 * - Same Category: Invoices with the same category
 * - Similar Amount: Invoices within ±30% of the current invoice amount
 *
 * **Features:**
 * - Horizontal carousel with smooth scrolling
 * - Relationship badges (Same Merchant, Same Category, Similar Amount)
 * - Mini invoice cards with name, date, amount, and category
 * - Click to navigate to related invoice detail page
 * - Maximum of 6 related invoices displayed
 *
 * **Context Requirements:**
 * Requires InvoiceContextProvider and useInvoicesStore for data access.
 */
const meta = {
  title: "Invoices/View Invoice/Cards/RelatedInvoicesCard",
  component: RelatedInvoicesCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Horizontal carousel card displaying related invoices based on merchant, category, or amount similarity. Features clickable mini cards with relationship badges and invoice summaries.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RelatedInvoicesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper to wrap RelatedInvoicesCard with InvoiceContext and populate store.
 */
function WithInvoiceContextAndStore({
  invoice = generateRandomInvoice(),
  relatedInvoices = [],
  merchant = null,
  children,
}: {
  readonly invoice?: ReturnType<typeof generateRandomInvoice>;
  readonly relatedInvoices?: Array<ReturnType<typeof generateRandomInvoice>>;
  readonly merchant?: null;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  // Populate the store with related invoices
  const {setEntities} = useInvoicesStore.getState();
  setEntities([invoice, ...relatedInvoices]);

  return (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      {children}
    </InvoiceContextProvider>
  );
}

/**
 * No related invoices found.
 *
 * **Story Description:**
 * Current invoice has no related invoices. Component should not render (null).
 */
export const NoRelated: Story = {
  render: () => {
    const invoice = generateRandomInvoice();

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={[]}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "No related invoices found. The component returns null and does not render anything.",
      },
    },
  },
};

/**
 * Related by same merchant (3 invoices).
 *
 * **Story Description:**
 * Shows 3 invoices from the same merchant in the carousel.
 */
export const SameMerchant: Story = {
  render: () => {
    const merchantId = "merchant-123";
    const invoice = generateRandomInvoice();
    invoice.merchantReference = merchantId;
    invoice.name = "Current Invoice";

    const relatedInvoices = Array(3)
      .fill(null)
      .map((_, i) => {
        const related = generateRandomInvoice();
        related.merchantReference = merchantId;
        related.name = `Related Invoice ${i + 1}`;
        related.createdAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
        return related;
      });

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Carousel displaying 3 related invoices from the same merchant. Each card shows 'Same Merchant' badge.",
      },
    },
  },
};

/**
 * Related by same category (4 invoices).
 *
 * **Story Description:**
 * Shows 4 invoices with the same category (Groceries).
 */
export const SameCategory: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.category = InvoiceCategory.GROCERIES;
    invoice.name = "Current Grocery Invoice";

    const relatedInvoices = Array(4)
      .fill(null)
      .map((_, i) => {
        const related = generateRandomInvoice();
        related.category = InvoiceCategory.GROCERIES;
        related.merchantReference = `merchant-${i}`; // Different merchants
        related.name = `Grocery Invoice ${i + 1}`;
        related.createdAt = new Date(Date.now() - (i + 1) * 48 * 60 * 60 * 1000);
        return related;
      });

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Carousel displaying 4 related invoices with the same category (Groceries). Each card shows 'Same Category' badge.",
      },
    },
  },
};

/**
 * Related by similar amount (5 invoices).
 *
 * **Story Description:**
 * Shows 5 invoices with similar total amounts (within ±30%).
 */
export const SimilarAmount: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.paymentInformation.totalCostAmount = 100.0;
    invoice.category = InvoiceCategory.NOT_DEFINED;
    invoice.merchantReference = "merchant-current";
    invoice.name = "Current Invoice (100 RON)";

    const relatedInvoices = Array(5)
      .fill(null)
      .map((_, i) => {
        const related = generateRandomInvoice();
        related.paymentInformation.totalCostAmount = 80 + i * 10; // 80, 90, 100, 110, 120
        related.category = InvoiceCategory.NOT_DEFINED;
        related.merchantReference = `merchant-${i}`;
        related.name = `Invoice ${related.paymentInformation.totalCostAmount} RON`;
        related.createdAt = new Date(Date.now() - (i + 1) * 72 * 60 * 60 * 1000);
        return related;
      });

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Carousel displaying 5 related invoices with similar amounts (within ±30% of 100 RON). Each card shows 'Similar Amount' badge.",
      },
    },
  },
};

/**
 * Maximum related invoices (6+, showing only 6).
 *
 * **Story Description:**
 * More than 6 related invoices available, but only the first 6 are displayed.
 */
export const MaximumRelated: Story = {
  render: () => {
    const merchantId = "merchant-abc";
    const invoice = generateRandomInvoice();
    invoice.merchantReference = merchantId;
    invoice.name = "Current Invoice";

    const relatedInvoices = Array(10)
      .fill(null)
      .map((_, i) => {
        const related = generateRandomInvoice();
        related.merchantReference = merchantId;
        related.name = `Related Invoice ${i + 1}`;
        related.createdAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
        return related;
      });

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "More than 6 related invoices available (10 total), but only the first 6 are displayed in the carousel.",
      },
    },
  },
};

/**
 * Mixed relationships (merchant, category, and amount).
 *
 * **Story Description:**
 * Demonstrates priority ordering: same merchant first, then same category, then similar amount.
 */
export const MixedRelationships: Story = {
  render: () => {
    const merchantId = "merchant-xyz";
    const invoice = generateRandomInvoice();
    invoice.merchantReference = merchantId;
    invoice.category = InvoiceCategory.GROCERIES;
    invoice.paymentInformation.totalCostAmount = 150.0;
    invoice.name = "Current Invoice";

    const relatedInvoices = [
      // Same merchant (highest priority)
      {
        ...generateRandomInvoice(),
        merchantReference: merchantId,
        category: InvoiceCategory.NOT_DEFINED,
        name: "Same Merchant 1",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      // Same category (medium priority)
      {
        ...generateRandomInvoice(),
        merchantReference: "different-merchant",
        category: InvoiceCategory.GROCERIES,
        name: "Same Category 1",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      // Similar amount (lowest priority)
      {
        ...generateRandomInvoice(),
        merchantReference: "another-merchant",
        category: InvoiceCategory.NOT_DEFINED,
        paymentInformation: {
          ...generateRandomInvoice().paymentInformation,
          totalCostAmount: 140.0,
        },
        name: "Similar Amount 1",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ];

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Mixed relationships demonstrating priority ordering: same merchant appears first, followed by same category, then similar amount.",
      },
    },
  },
};

/**
 * Related invoices with long names.
 *
 * **Story Description:**
 * Tests layout with very long invoice names to ensure proper wrapping/truncation.
 */
export const LongNames: Story = {
  render: () => {
    const merchantId = "merchant-long";
    const invoice = generateRandomInvoice();
    invoice.merchantReference = merchantId;
    invoice.name = "Current Invoice with Reasonable Name";

    const relatedInvoices = Array(3)
      .fill(null)
      .map((_, i) => {
        const related = generateRandomInvoice();
        related.merchantReference = merchantId;
        related.name = `Invoice with Very Long Name Including Many Details About The Purchase Transaction and Store Location Number ${i + 1}`;
        related.createdAt = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
        return related;
      });

    return (
      <WithInvoiceContextAndStore
        invoice={invoice}
        relatedInvoices={relatedInvoices}>
        <RelatedInvoicesCard />
      </WithInvoiceContextAndStore>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Related invoices with very long names. Tests text wrapping and truncation in the mini invoice cards.",
      },
    },
  },
};
