import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, WithEditInvoiceContext} from "../../../../_storybook";
import ItemsTable from "./ItemsTable";

/**
 * ItemsTable renders a paginated table of invoice line items with editing
 * capabilities.
 */
const meta = {
  title: "Invoices/EditInvoice/Tables/ItemsTable",
  component: ItemsTable,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Paginated table of invoice line items with inline editing, search, category assignment, and delete capabilities. Supports add new item row, bulk select and delete, sort columns, and search within items.",
      },
    },
  },
  decorators: [
    (Story) => (
      <WithEditInvoiceContext>
        <div style={{padding: "2rem", backgroundColor: "var(--color-background)", minWidth: "800px"}}>
          <Story />
        </div>
      </WithEditInvoiceContext>
    ),
  ],
} satisfies Meta<typeof ItemsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Items table with sample products from story invoice. */
export const WithItems: Story = {
  args: {
    invoice: storyInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Table showing invoice line items with inline editing, search, and category assignment. Story invoice includes 4 products (milk, bread, eggs, apples). Click cells to edit in-place, use checkboxes for bulk actions.",
      },
    },
  },
};

/** Empty items table with no products. */
export const Empty: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      products: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state showing no items on the invoice. Displays message encouraging user to add items via the Items dialog.",
      },
    },
  },
};
