import {Product, ProductCategory} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import GuidedEditBanner from "./GuidedEditBanner";

/**
 * GuidedEditBanner displays a dismissible alert banner showing products that need review.
 *
 * ## Features
 * - Shows count of incomplete products
 * - Displays issue summary (uncategorized, low confidence, missing names)
 * - "Review All" button to scroll to first issue
 * - Dismissible with localStorage persistence
 * - Responsive layout with badges
 */
const meta = {
  title: "Invoices/Edit Invoice/GuidedEditBanner",
  component: GuidedEditBanner,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Guided editing banner that analyzes invoice items and highlights products requiring manual review after AI analysis.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      description: "Array of invoice products to analyze",
      control: false,
    },
    onReviewAll: {
      description: "Callback function triggered when 'Review All' button is clicked",
      action: "reviewAll",
    },
  },
} satisfies Meta<typeof GuidedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock products with various issues
const createMockProduct = (overrides: Partial<Product>): Product => ({
  name: "Product Name",
  category: ProductCategory.GROCERIES,
  quantity: 1,
  quantityUnit: "pcs",
  productCode: "",
  price: 10.0,
  totalPrice: 10.0,
  detectedAllergens: [],
  metadata: {
    isEdited: false,
    isComplete: true,
    isSoftDeleted: false,
    confidence: 1.0,
  },
  ...overrides,
});

const completeProducts: Product[] = [
  createMockProduct({name: "Complete Product 1"}),
  createMockProduct({name: "Complete Product 2"}),
];

const incompleteProducts: Product[] = [
  createMockProduct({
    name: "Uncategorized Product",
    category: ProductCategory.NOT_DEFINED,
    metadata: {
      isEdited: false,
      isComplete: false,
      isSoftDeleted: false,
      confidence: 1.0,
    },
  }),
  createMockProduct({
    name: "Low Confidence Product",
    metadata: {
      isEdited: false,
      isComplete: false,
      isSoftDeleted: false,
      confidence: 0.5,
    },
  }),
  createMockProduct({
    name: "MISSING NAME PRODUCT",
    metadata: {
      isEdited: false,
      isComplete: false,
      isSoftDeleted: false,
      confidence: 1.0,
    },
  }),
];

const mixedProducts: Product[] = [
  ...completeProducts,
  ...incompleteProducts,
  createMockProduct({
    name: "Another Incomplete",
    category: ProductCategory.NOT_DEFINED,
    metadata: {
      isEdited: false,
      isComplete: false,
      isSoftDeleted: false,
      confidence: 0.3,
    },
  }),
];

/**
 * No issues detected - banner should not render
 */
export const NoIssues: Story = {
  args: {
    items: completeProducts,
  },
};

/**
 * Single uncategorized product
 */
export const SingleIssue: Story = {
  args: {
    items: [
      createMockProduct({
        name: "Uncategorized Product",
        category: ProductCategory.NOT_DEFINED,
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
    ],
  },
};

/**
 * Multiple products with various issues (default state)
 */
export const MultipleIssues: Story = {
  args: {
    items: incompleteProducts,
  },
};

/**
 * Mixed complete and incomplete products
 */
export const MixedProducts: Story = {
  args: {
    items: mixedProducts,
  },
};

/**
 * Only low confidence issues
 */
export const OnlyLowConfidence: Story = {
  args: {
    items: [
      createMockProduct({
        name: "Low Confidence 1",
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 0.4,
        },
      }),
      createMockProduct({
        name: "Low Confidence 2",
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 0.6,
        },
      }),
    ],
  },
};

/**
 * Only uncategorized issues
 */
export const OnlyUncategorized: Story = {
  args: {
    items: [
      createMockProduct({
        name: "Uncategorized 1",
        category: ProductCategory.NOT_DEFINED,
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
      createMockProduct({
        name: "Uncategorized 2",
        category: ProductCategory.NOT_DEFINED,
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
      createMockProduct({
        name: "Uncategorized 3",
        category: ProductCategory.NOT_DEFINED,
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
    ],
  },
};

/**
 * Only missing name issues
 */
export const OnlyMissingNames: Story = {
  args: {
    items: [
      createMockProduct({
        name: "RAW OCR TEXT 1",
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
      createMockProduct({
        name: "RAW OCR TEXT 2",
        metadata: {
          isEdited: false,
          isComplete: false,
          isSoftDeleted: false,
          confidence: 1.0,
        },
      }),
    ],
  },
};

/**
 * Large number of issues
 */
export const ManyIssues: Story = {
  args: {
    items: [
      ...Array.from({length: 10}, (_, i) =>
        createMockProduct({
          name: `Product ${i + 1}`,
          category: ProductCategory.NOT_DEFINED,
          metadata: {
            isEdited: false,
            isComplete: false,
            isSoftDeleted: false,
            confidence: 0.3 + Math.random() * 0.3,
          },
        }),
      ),
    ],
  },
};
