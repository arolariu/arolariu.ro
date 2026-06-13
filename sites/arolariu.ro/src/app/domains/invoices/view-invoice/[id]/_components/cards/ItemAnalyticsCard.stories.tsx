import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyProducts} from "@/app/domains/invoices/_storybook";
import {ProductCategory} from "@/types/invoices";
import {ItemAnalyticsCard} from "./ItemAnalyticsCard";

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
} satisfies Meta<typeof ItemAnalyticsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Default item analytics table with 4 products (milk, bread, eggs, apples)." } } },
};

export const WithCategorizedProducts: Story = {
  render: () => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      category: [ProductCategory.GROCERIES, ProductCategory.DAIRY, ProductCategory.BAKED_GOODS, ProductCategory.MEAT][i % 4] ?? ProductCategory.NOT_DEFINED,
      quantity: i + 1,
      price: 5 + i * 2,
      totalPrice: (i + 1) * (5 + i * 2),
    }));
    return (
      <WithViewInvoiceContext invoice={{...storyInvoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "4 products with varied categories and quantities." } } },
};

export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: []}}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Empty invoice with no items." } } },
};

export const WidePriceRange: Story = {
  render: () => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      price: [0.5, 15.0, 120.0, 350.99][i] ?? 0,
      quantity: 1,
      totalPrice: [0.5, 15.0, 120.0, 350.99][i] ?? 0,
    }));
    return (
      <WithViewInvoiceContext invoice={{...storyInvoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "4 products with wide price range (0.50 to 350.99) testing currency formatting." } } },
};

export const HighQuantities: Story = {
  render: () => {
    const products = storyProducts.map((product, i) => ({
      ...product,
      quantity: [1, 10, 50, 100][i] ?? 1,
      price: 2.5,
      totalPrice: ([1, 10, 50, 100][i] ?? 1) * 2.5,
    }));
    return (
      <WithViewInvoiceContext invoice={{...storyInvoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "4 products with bulk quantities (1, 10, 50, 100 units)." } } },
};