import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyProducts} from "@/app/domains/invoices/_storybook";
import {ProductCategory} from "@/types/invoices";
import {ItemAnalyticsCard} from "./ItemAnalyticsCard";

const meta = {
  title: "Invoices/View Invoice/Cards/ItemAnalyticsCard",
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
  render: () => {
    const products = storyProducts.slice(0, 8).map((product, i) => ({
      ...product,
      category: [ProductCategory.GROCERIES, ProductCategory.DAIRY, ProductCategory.BAKED_GOODS, ProductCategory.MEAT][i % 4],
      purchaseInformation: {...product.purchaseInformation, quantity: i + 1, unitPrice: 5 + i * 2},
    }));
    return (
      <WithViewInvoiceContext invoice={{...storyInvoice, items: products}}>
        <ItemAnalyticsCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: { docs: { description: { story: "Default item analytics table with 8 products." } } },
};

export const ManyItems: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: storyProducts.slice(0, 25)}}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Large invoice with 25+ items." } } },
};

export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: []}}>
      <ItemAnalyticsCard />
    </WithViewInvoiceContext>
  ),
  parameters: { docs: { description: { story: "Empty invoice with no items." } } },
};