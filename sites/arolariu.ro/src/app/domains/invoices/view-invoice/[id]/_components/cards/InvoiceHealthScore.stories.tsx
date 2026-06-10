import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice, generateRandomProduct} from "@/data/mocks";
import {ProductCategory} from "@/types/invoices";
import {InvoiceHealthScore} from "./InvoiceHealthScore";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";

/**
 * Invoice Health Score component displaying data quality metrics.
 *
 * **Component Description:**
 * Displays a comprehensive "health score" (0-100) for invoice data quality,
 * encouraging users to improve data completeness and accuracy. Includes:
 * - Animated circular progress meter with color-coded status
 * - Weighted scoring across multiple quality dimensions
 * - Actionable improvement suggestions with direct links
 * - Detailed factor breakdown in collapsible view
 *
 * **Scoring Factors:**
 * - Products present (15%)
 * - Product completeness (20%)
 * - OCR confidence (20%)
 * - Merchant linked (10%)
 * - Payment info (15%)
 * - Categories assigned (10%)
 * - Recipes generated (10%)
 *
 * **Context Requirements:**
 * Requires InvoiceContextProvider to access invoice data.
 */
const meta = {
  title: "Invoices/View Invoice/Cards/InvoiceHealthScore",
  component: InvoiceHealthScore,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Health score card displaying invoice data quality metrics with weighted scoring (0-100). Features circular progress visualization, actionable improvement suggestions, and collapsible factor breakdown.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InvoiceHealthScore>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper to wrap InvoiceHealthScore with InvoiceContext.
 */
function WithInvoiceContext({
  invoice = generateRandomInvoice(),
  merchant = null,
  children,
}: {
  readonly invoice?: ReturnType<typeof generateRandomInvoice>;
  readonly merchant?: null;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      {children}
    </InvoiceContextProvider>
  );
}

/**
 * Perfect invoice with 100% health score.
 *
 * **Story Description:**
 * All quality factors met: complete products, high OCR confidence,
 * merchant linked, payment info complete, all categories assigned, recipes generated.
 */
export const Perfect: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(10)
      .fill(null)
      .map(() => {
        const product = generateRandomProduct();
        product.metadata.isComplete = true;
        product.metadata.confidence = 0.95;
        product.category = ProductCategory.GROCERIES;
        return product;
      });
    invoice.merchantReference = "merchant-uuid-123";
    invoice.paymentInformation.transactionDate = new Date();
    invoice.paymentInformation.totalCostAmount = 150.5;
    invoice.paymentInformation.currency = {code: "RON", symbol: "lei", name: "Romanian Leu"};
    invoice.possibleRecipes = [
      {id: "recipe-1", name: "Pasta Carbonara", complexity: 1, ingredients: [], instructions: [], metadata: {isComplete: true, confidence: 0.9, isSoftDeleted: false}},
    ];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Perfect invoice with 100% health score. All quality factors are met: complete products, high OCR confidence, merchant linked, payment info complete, categories assigned, and recipes generated.",
      },
    },
  },
};

/**
 * Good invoice with 75% health score.
 *
 * **Story Description:**
 * Most factors met but missing recipes and some products incomplete.
 */
export const Good: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(8)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.metadata.isComplete = i < 6; // 75% complete
        product.metadata.confidence = 0.85;
        product.category = ProductCategory.GROCERIES;
        return product;
      });
    invoice.merchantReference = "merchant-uuid-456";
    invoice.paymentInformation.transactionDate = new Date();
    invoice.paymentInformation.totalCostAmount = 89.99;
    invoice.paymentInformation.currency = {code: "RON", symbol: "RON", name: "Romanian Leu"};
    invoice.possibleRecipes = []; // No recipes

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Good invoice with ~75% health score. Has merchant, payment info, and categorized products, but some products are incomplete and no recipes have been generated.",
      },
    },
  },
};

/**
 * Needs attention - 50% health score.
 *
 * **Story Description:**
 * Several quality issues: low OCR confidence, no merchant, uncategorized products.
 */
export const NeedsAttention: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(5)
      .fill(null)
      .map(() => {
        const product = generateRandomProduct();
        product.metadata.isComplete = false;
        product.metadata.confidence = 0.6; // Low confidence
        product.category = ProductCategory.NOT_DEFINED; // Uncategorized
        return product;
      });
    invoice.merchantReference = "00000000-0000-0000-0000-000000000000"; // Empty GUID
    invoice.paymentInformation.transactionDate = new Date();
    invoice.paymentInformation.totalCostAmount = 45.0;
    invoice.paymentInformation.currency = {code: "RON", symbol: "lei", name: "Romanian Leu"};
    invoice.possibleRecipes = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice needing attention (~50% score). Issues: low OCR confidence, no merchant linked, uncategorized products, incomplete product data, and no recipes.",
      },
    },
  },
};

/**
 * Incomplete invoice - 25% health score.
 *
 * **Story Description:**
 * Minimal data: few products, low confidence, no merchant, incomplete payment info.
 */
export const Incomplete: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(2)
      .fill(null)
      .map(() => {
        const product = generateRandomProduct();
        product.metadata.isComplete = false;
        product.metadata.confidence = 0.3;
        product.category = ProductCategory.NOT_DEFINED;
        return product;
      });
    invoice.merchantReference = "00000000-0000-0000-0000-000000000000";
    invoice.paymentInformation.transactionDate = undefined;
    invoice.paymentInformation.totalCostAmount = 0;
    invoice.paymentInformation.currency = {code: "", symbol: "", name: ""};
    invoice.possibleRecipes = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Incomplete invoice with ~25% health score. Minimal data: only 2 products, low OCR confidence, no merchant, incomplete payment information, and no recipes.",
      },
    },
  },
};

/**
 * Empty invoice - 0% health score.
 *
 * **Story Description:**
 * No products, no data - lowest possible score.
 */
export const Empty: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = [];
    invoice.merchantReference = "00000000-0000-0000-0000-000000000000";
    invoice.paymentInformation.transactionDate = undefined;
    invoice.paymentInformation.totalCostAmount = 0;
    invoice.paymentInformation.currency = {code: "", symbol: "", name: ""};
    invoice.possibleRecipes = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Empty invoice with 0% health score. No products, no merchant, no payment information, and no recipes. Shows maximum number of improvement suggestions.",
      },
    },
  },
};

/**
 * Partial completeness - some products complete, some not.
 *
 * **Story Description:**
 * Mixed state: half products complete, half incomplete, demonstrating partial scoring.
 */
export const PartialCompleteness: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(10)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.metadata.isComplete = i % 2 === 0; // 50% complete
        product.metadata.confidence = i % 2 === 0 ? 0.9 : 0.5;
        product.category = i % 2 === 0 ? ProductCategory.GROCERIES : ProductCategory.NOT_DEFINED;
        return product;
      });
    invoice.merchantReference = "merchant-uuid-789";
    invoice.paymentInformation.transactionDate = new Date();
    invoice.paymentInformation.totalCostAmount = 125.0;
    invoice.paymentInformation.currency = {code: "RON", symbol: "RON", name: "Romanian Leu"};
    invoice.possibleRecipes = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with partial completeness (~60% score). Half the products are complete with high confidence and categories, while the other half are incomplete. Demonstrates partial credit scoring.",
      },
    },
  },
};

/**
 * High OCR confidence but missing categories.
 *
 * **Story Description:**
 * Products have high OCR confidence but lack category assignments.
 */
export const HighConfidenceNoCategorization: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(7)
      .fill(null)
      .map(() => {
        const product = generateRandomProduct();
        product.metadata.isComplete = true;
        product.metadata.confidence = 0.95;
        product.category = ProductCategory.NOT_DEFINED; // High confidence but not categorized
        return product;
      });
    invoice.merchantReference = "merchant-uuid-abc";
    invoice.paymentInformation.transactionDate = new Date();
    invoice.paymentInformation.totalCostAmount = 200.0;
    invoice.paymentInformation.currency = {code: "RON", symbol: "lei", name: "Romanian Leu"};
    invoice.possibleRecipes = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with high OCR confidence (95%) but no product categorization. Demonstrates the importance of category assignments in the overall health score.",
      },
    },
  },
};
