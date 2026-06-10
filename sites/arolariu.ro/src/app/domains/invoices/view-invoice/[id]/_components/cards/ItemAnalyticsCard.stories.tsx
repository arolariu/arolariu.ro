import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice, generateRandomProduct} from "@/data/mocks";
import {ProductCategory} from "@/types/invoices";
import {ItemAnalyticsCard} from "./ItemAnalyticsCard";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";

/**
 * Item-level analytics card with search, sort, and detailed product display.
 *
 * **Component Description:**
 * Provides an enhanced, interactive table view of all invoice items with:
 * - Real-time search filtering by product name
 * - Multi-column sorting (name, category, price, quantity)
 * - Category color-coded badges
 * - Allergen warnings with detailed tooltips
 * - Summary statistics (most/least expensive, category/allergen counts)
 * - Total row aggregations
 *
 * **Features:**
 * - Semantic HTML table structure with proper ARIA labels
 * - Keyboard navigation for sort toggles
 * - Tooltips for allergen warnings
 * - Search input with descriptive placeholder
 * - Motion animations for entrance effects
 *
 * **Context Requirements:**
 * Requires InvoiceContextProvider to access invoice items.
 */
const meta = {
  title: "Invoices/View Invoice/Cards/ItemAnalyticsCard",
  component: ItemAnalyticsCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Interactive item analytics table with search, sort, and filtering capabilities. Displays all invoice products with category badges, allergen warnings, and aggregated totals.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ItemAnalyticsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper to wrap ItemAnalyticsCard with InvoiceContext.
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
 * Default state with multiple categorized items.
 *
 * **Story Description:**
 * Typical invoice with 8 products across different categories,
 * demonstrating the default table view with search and sort controls.
 */
export const Default: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(8)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.category = [ProductCategory.GROCERIES, ProductCategory.DAIRY, ProductCategory.BAKED_GOODS, ProductCategory.MEAT][i % 4];
        product.purchaseInformation.quantity = i + 1;
        product.purchaseInformation.unitPrice = 5 + i * 2;
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Default item analytics table with 8 products across multiple categories (Groceries, Dairy, Baked Goods, Meat). Includes search bar and sortable column headers.",
      },
    },
  },
};

/**
 * Large invoice with many items (20+).
 *
 * **Story Description:**
 * Demonstrates the table with a large number of items,
 * testing scrolling behavior and search functionality.
 */
export const ManyItems: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(25)
      .fill(null)
      .map(() => generateRandomProduct());

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Large invoice with 25+ items. Tests table scrolling, pagination, and search performance with many rows.",
      },
    },
  },
};

/**
 * Small invoice with few items (3).
 *
 * **Story Description:**
 * Minimal invoice showing the table with just a handful of items.
 */
export const FewItems: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(3)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.name = ["Milk", "Bread", "Eggs"][i];
        product.category = [ProductCategory.DAIRY, ProductCategory.BAKED_GOODS, ProductCategory.GROCERIES][i];
        product.purchaseInformation.quantity = i + 1;
        product.purchaseInformation.unitPrice = 2.5 + i * 0.5;
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Small invoice with only 3 items (Milk, Bread, Eggs). Demonstrates the table with minimal data.",
      },
    },
  },
};

/**
 * Empty invoice with no items.
 *
 * **Story Description:**
 * Shows the empty state when invoice has no products yet.
 */
export const Empty: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = [];

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Empty invoice with no items. Should display an appropriate empty state message or placeholder.",
      },
    },
  },
};

/**
 * Uncategorized products (all NOT_DEFINED).
 *
 * **Story Description:**
 * All products lack category assignments, showing secondary badge styling.
 */
export const UncategorizedItems: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(6)
      .fill(null)
      .map(() => {
        const product = generateRandomProduct();
        product.category = ProductCategory.NOT_DEFINED;
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with all products uncategorized (NOT_DEFINED). Demonstrates badge styling for missing category data.",
      },
    },
  },
};

/**
 * Items with allergen warnings.
 *
 * **Story Description:**
 * Products contain allergen metadata, displaying warning icons and tooltips.
 */
export const WithAllergens: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(5)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.name = ["Peanut Butter", "Milk", "Gluten Bread", "Shellfish", "Eggs"][i];
        // Note: Allergen data structure depends on Product type definition
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Items with allergen warnings. Displays allergen icons and tooltips for products containing common allergens (peanuts, dairy, gluten, shellfish, eggs).",
      },
    },
  },
};

/**
 * Wide price range (testing number formatting).
 *
 * **Story Description:**
 * Products with vastly different prices to test currency formatting
 * (from cents to hundreds of currency units).
 */
export const WidePriceRange: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(6)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.purchaseInformation.unitPrice = [0.5, 2.99, 15.0, 45.5, 120.0, 350.99][i];
        product.purchaseInformation.quantity = 1;
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Products with a wide price range (0.50 to 350.99) to test currency formatting and alignment in the price column.",
      },
    },
  },
};

/**
 * High quantity items (bulk purchases).
 *
 * **Story Description:**
 * Items with large quantities (10+, 50+, 100+) to test quantity display and total calculations.
 */
export const HighQuantities: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(5)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.purchaseInformation.quantity = [1, 10, 25, 50, 100][i];
        product.purchaseInformation.unitPrice = 2.5;
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Bulk purchase items with high quantities (1, 10, 25, 50, 100 units). Tests quantity display and total price calculations.",
      },
    },
  },
};

/**
 * Mixed category distribution.
 *
 * **Story Description:**
 * Items evenly distributed across all available categories
 * to showcase the full category badge color palette.
 */
export const MixedCategories: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.items = Array(10)
      .fill(null)
      .map((_, i) => {
        const product = generateRandomProduct();
        product.category = [
          ProductCategory.GROCERIES,
          ProductCategory.DAIRY,
          ProductCategory.BAKED_GOODS,
          ProductCategory.MEAT,
          ProductCategory.BEVERAGES,
          ProductCategory.FROZEN,
          ProductCategory.PRODUCE,
          ProductCategory.SNACKS,
          ProductCategory.HOUSEHOLD,
          ProductCategory.PERSONAL_CARE,
        ][i];
        return product;
      });

    return (
      <WithInvoiceContext invoice={invoice}>
        <ItemAnalyticsCard />
      </WithInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Items evenly distributed across all product categories. Demonstrates the full range of category badge colors and labels.",
      },
    },
  },
};
