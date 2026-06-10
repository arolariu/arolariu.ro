import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyProducts} from "@/app/domains/invoices/_storybook";
import {ProductCategory} from "@/types/invoices";
import {InvoiceHealthScore} from "./InvoiceHealthScore";

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
 * Perfect invoice with 100% health score.
 *
 * **Story Description:**
 * All quality factors met: complete products, high OCR confidence,
 * merchant linked, payment info complete, all categories assigned, recipes generated.
 */
export const Perfect: Story = {
  render: () => {
    const completeProducts = storyProducts.slice(0, 10).map(product => ({
      ...product,
      metadata: {...product.metadata, isComplete: true, confidence: 0.95},
      category: ProductCategory.GROCERIES,
    }));

    const invoice = {
      ...storyInvoice,
      items: completeProducts,
      merchantReference: "merchant-uuid-123",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(),
        totalCostAmount: 150.5,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      },
      possibleRecipes: [
        {id: "recipe-1", name: "Pasta Carbonara", complexity: 1, ingredients: [], instructions: [], metadata: {isComplete: true, confidence: 0.9, isSoftDeleted: false}},
      ],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
    const partialProducts = storyProducts.map((product, i) => ({
      ...product,
      metadata: {...product.metadata, isComplete: i < 3, confidence: 0.85},
      category: ProductCategory.GROCERIES,
    }));

    const invoice = {
      ...storyInvoice,
      items: partialProducts,
      merchantReference: "merchant-uuid-456",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(),
        totalCostAmount: 89.99,
        currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Good invoice with ~75% health score: 4 products, 3 complete (75% completeness), all with good OCR confidence (0.85), merchant linked, payment info complete, but no recipes.",
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
    const lowQualityProducts = storyProducts.slice(0, 5).map(product => ({
      ...product,
      metadata: {...product.metadata, isComplete: false, confidence: 0.6},
      category: ProductCategory.NOT_DEFINED,
    }));

    const invoice = {
      ...storyInvoice,
      items: lowQualityProducts,
      merchantReference: "00000000-0000-0000-0000-000000000000",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(),
        totalCostAmount: 45.0,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
    const minimalProducts = storyProducts.slice(0, 2).map(product => ({
      ...product,
      metadata: {...product.metadata, isComplete: false, confidence: 0.3},
      category: ProductCategory.NOT_DEFINED,
    }));

    const invoice = {
      ...storyInvoice,
      items: minimalProducts,
      merchantReference: "00000000-0000-0000-0000-000000000000",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: undefined,
        totalCostAmount: 0,
        currency: {code: "", symbol: "", name: ""},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
    const invoice = {
      ...storyInvoice,
      items: [],
      merchantReference: "00000000-0000-0000-0000-000000000000",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: undefined,
        totalCostAmount: 0,
        currency: {code: "", symbol: "", name: ""},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
    const partialProducts = storyProducts.slice(0, 10).map((product, i) => ({
      ...product,
      metadata: {...product.metadata, isComplete: i % 2 === 0, confidence: i % 2 === 0 ? 0.9 : 0.5},
      category: i % 2 === 0 ? ProductCategory.GROCERIES : ProductCategory.NOT_DEFINED,
    }));

    const invoice = {
      ...storyInvoice,
      items: partialProducts,
      merchantReference: "merchant-uuid-789",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(),
        totalCostAmount: 125.0,
        currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
    const uncategorizedProducts = storyProducts.slice(0, 7).map(product => ({
      ...product,
      metadata: {...product.metadata, isComplete: true, confidence: 0.95},
      category: ProductCategory.NOT_DEFINED,
    }));

    const invoice = {
      ...storyInvoice,
      items: uncategorizedProducts,
      merchantReference: "merchant-uuid-abc",
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(),
        totalCostAmount: 200.0,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      },
      possibleRecipes: [],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
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
