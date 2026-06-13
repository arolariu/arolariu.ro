import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {expect, within} from "storybook/test";
import {invoicePresets, setupViewInvoiceStory, storyInvoice, storyProducts, storyRecipeEasy, WithViewInvoiceContext, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {ProductCategory} from "@/types/invoices";
import {InvoiceHealthScore} from "./InvoiceHealthScore";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

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
  title: "arolariu.ro/IMS/Cards/Invoice/InvoiceHealthScore",
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
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
  beforeEach: ({args}) => {
    setupViewInvoiceStory({invoice: (args as {invoice: Invoice}).invoice});
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Perfect invoice with 99% health score.
 *
 * **Story Description:**
 * All quality factors met: complete products, high OCR confidence (95% rounds to 19/20 points),
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
      possibleRecipes: [storyRecipeEasy],
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
        <InvoiceHealthScore />
      </WithViewInvoiceContext>
    );
  },
  play: async ({canvasElement, step}) => {
    const canvas = within(canvasElement);

    await step("renders health score content", async () => {
      await expect(canvas.getAllByText(/health/i).length).toBeGreaterThan(0);
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Perfect invoice with 99% health score. All quality factors are met: complete products, high OCR confidence (95% confidence rounds to 19/20 points), merchant linked, payment info complete, categories assigned, and recipes generated. Total: 15 + 20 + 19 + 10 + 15 + 10 + 10 = 99%.",
      },
    },
  },
};

/**
 * Good invoice with ~82% health score.
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
        story: "Good invoice with ~82% health score: 4 products (15%), 3 complete of 4 (15% completeness), all with good OCR confidence 0.85 (17%), merchant linked (10%), payment info complete (15%), all categorized (10%), but no recipes (0%). Total: 15 + 15 + 17 + 10 + 15 + 10 + 0 = 82%.",
      },
    },
  },
};

/**
 * Needs attention - 42% health score.
 *
 * **Story Description:**
 * Several quality issues: low OCR confidence (60%), no merchant, uncategorized products.
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
        story: "Invoice needing attention (42% score). Issues: low OCR confidence (60% = 12 pts), no merchant linked, uncategorized products, incomplete product data, and no recipes. Total: 15 + 0 + 12 + 0 + 15 + 0 + 0 = 42%.",
      },
    },
  },
};

/**
 * Incomplete invoice - 21% health score.
 *
 * **Story Description:**
 * Minimal data: few products, low confidence (30%), no merchant, incomplete payment info.
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
        transactionDate: new Date(0),
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
        story: "Incomplete invoice with 21% health score. Minimal data: only 2 products, low OCR confidence (30% = 6 pts), no merchant, incomplete payment information, and no recipes. Total: 15 + 0 + 6 + 0 + 0 + 0 + 0 = 21%.",
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
        transactionDate: new Date(0),
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
 * Partial completeness - 69% health score.
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
        story: "Invoice with partial completeness (69% score). Half the products are complete with high confidence (90%) and categories, while the other half are incomplete (50% confidence). Average OCR = 70% (14 pts), 50% completeness (10 pts), 50% categorization (5 pts). Total: 15 + 10 + 14 + 10 + 15 + 5 + 0 = 69%.",
      },
    },
  },
};

/**
 * High OCR confidence but missing categories - 79% health score.
 *
 * **Story Description:**
 * Products have high OCR confidence but lack category assignments.
 * Demonstrates that strong OCR and completeness can still yield a good score,
 * but missing categorization prevents reaching excellence.
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
        story: "Invoice with high OCR confidence but no categorization (79% score). All 4 products are complete with 95% OCR confidence, merchant linked, and payment info present, but no categories or recipes. Total: 15 + 20 + 19 + 10 + 15 + 0 + 0 = 79%.",
      },
    },
  },
};
