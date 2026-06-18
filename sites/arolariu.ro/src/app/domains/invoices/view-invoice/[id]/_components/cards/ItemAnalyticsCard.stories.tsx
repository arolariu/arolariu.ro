import {
  invoicePresets,
  storyInvoice,
  storyLowConfidenceInvoice,
  storyManyAllergensInvoice,
  storyMixedConfidenceInvoice,
  storyProducts,
  storySoftDeletedItemsInvoice,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice, Product} from "@/types/invoices";
import {ProductCategory} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {ItemAnalyticsCard} from "./ItemAnalyticsCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const meta = {
  title: "arolariu.ro/IMS/Cards/Products/ItemAnalytics",
  component: ItemAnalyticsCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Interactive item analytics table with search, sort, and filtering capabilities.",
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
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Default item analytics table with 4 products (milk, bread, eggs, apples)."}}},
};

export const WithCategorizedProducts: Story = {
  render: ({invoice}) => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      category:
        [ProductCategory.GROCERIES, ProductCategory.DAIRY, ProductCategory.BAKED_GOODS, ProductCategory.MEAT][i % 4]
        ?? ProductCategory.NOT_DEFINED,
      quantity: i + 1,
      price: 5 + i * 2,
      totalPrice: (i + 1) * (5 + i * 2),
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "4 products with varied categories and quantities."}}},
};

export const Empty: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, items: []}}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Empty invoice with no items."}}},
};

export const WidePriceRange: Story = {
  render: ({invoice}) => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      price: [0.5, 15.0, 120.0, 350.99][i] ?? 0,
      quantity: 1,
      totalPrice: [0.5, 15.0, 120.0, 350.99][i] ?? 0,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "4 products with wide price range (0.50 to 350.99) testing currency formatting."}}},
};

export const HighQuantities: Story = {
  render: ({invoice}) => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      quantity: [1, 10, 50, 100][i] ?? 1,
      price: 2.5,
      totalPrice: ([1, 10, 50, 100][i] ?? 1) * 2.5,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "4 products with bulk quantities (1, 10, 50, 100 units)."}}},
};

/** Invoice with single item only. */
export const SingleItem: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, items: invoice.items.slice(0, 1)}}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice containing only one product item."}}},
};

/** Invoice with many items — scroll/pagination test. */
export const ManyItems: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = storyProducts[0]!;
    const products: Product[] = Array.from({length: 30}, (_, i) => {
      const product: Product = {
        ...baseProduct,
        name: `Product ${i + 1}`,
        quantity: (i % 5) + 1,
        price: Number(((i % 20) + 2.99).toFixed(2)),
        totalPrice: Number((((i % 5) + 1) * ((i % 20) + 2.99)).toFixed(2)),
        category: [ProductCategory.GROCERIES, ProductCategory.DAIRY, ProductCategory.BAKED_GOODS][i % 3] ?? ProductCategory.NOT_DEFINED,
      };
      return product;
    });
    const manyItemsInvoice: typeof invoice = {...invoice, items: products};
    return (
      <WithViewInvoiceContext invoice={manyItemsInvoice}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Invoice with 30 items to verify table scrolling and pagination."}}},
};

/** Products with zero prices — edge case. */
export const ZeroPrices: Story = {
  render: ({invoice}) => {
    const products = storyProducts.map((product) => ({
      ...product,
      price: 0,
      totalPrice: 0,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products with zero prices to test edge-case currency formatting."}}},
};

/** Products with low confidence. */
export const LowConfidenceProducts: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyLowConfidenceInvoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Products with low OCR confidence (30%) to verify confidence indicators."}}},
};

/** Products with mixed confidence levels. */
export const MixedConfidenceProducts: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyMixedConfidenceInvoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Products with mixed confidence levels (95% and 40%) to test confidence display."}}},
};

/** Products with allergens. */
export const ProductsWithAllergens: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyManyAllergensInvoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Products with multiple allergens (lactose, gluten, nuts) per item."}}},
};

/** Products with soft-deleted items. */
export const WithSoftDeletedItems: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storySoftDeletedItemsInvoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: {docs: {description: {story: "Invoice containing soft-deleted items to verify deletion markers."}}},
};

/** Products with fractional quantities. */
export const FractionalQuantities: Story = {
  render: ({invoice}) => {
    const products: Product[] = storyProducts.map((product, i) => ({
      ...product,
      quantity: [0.5, 1.25, 2.75, 3.33][i] ?? 1,
      price: 10.0,
      totalPrice: ([0.5, 1.25, 2.75, 3.33][i] ?? 1) * 10.0,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products with fractional quantities (0.5, 1.25, 2.75, 3.33) to test decimal display."}}},
};

/** Products with varied categories — full spectrum. */
export const VariedCategories: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = storyProducts[0]!;
    const products: Product[] = [
      {...baseProduct, name: "Milk", category: ProductCategory.DAIRY},
      {...baseProduct, name: "Bread", category: ProductCategory.BAKED_GOODS},
      {...baseProduct, name: "Chicken", category: ProductCategory.MEAT},
      {...baseProduct, name: "Tomatoes", category: ProductCategory.VEGETABLES},
      {...baseProduct, name: "Wine", category: ProductCategory.ALCOHOLIC_BEVERAGES},
      {...baseProduct, name: "Chocolate", category: ProductCategory.OTHER},
    ];
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products spanning 6 different categories to test category diversity display."}}},
};

/** Products with very small prices — under 1.00. */
export const VerySmallPrices: Story = {
  render: ({invoice}) => {
    const products: Product[] = storyProducts.map((product, i) => ({
      ...product,
      price: [0.01, 0.25, 0.5, 0.99][i] ?? 1,
      totalPrice: [0.01, 0.25, 0.5, 0.99][i] ?? 1,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products with very small prices (0.01 to 0.99) to test sub-unit currency formatting."}}},
};

/** Products with duplicate names. */
export const DuplicateNames: Story = {
  render: ({invoice}) => {
    const products: Product[] = storyProducts.map((product) => ({
      ...product,
      name: "Generic Product",
      price: 5.0,
      totalPrice: 5.0,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products with identical names to test duplicate item handling."}}},
};

/** Products with very high quantities — bulk purchase. */
export const BulkQuantities: Story = {
  render: ({invoice}) => {
    const products: Product[] = storyProducts.map((product, i) => ({
      ...product,
      quantity: [100, 250, 500, 1000][i] ?? 1,
      price: 0.5,
      totalPrice: ([100, 250, 500, 1000][i] ?? 1) * 0.5,
    }));
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "Products with very high quantities (100, 250, 500, 1000) to test bulk purchase display."}}},
};
