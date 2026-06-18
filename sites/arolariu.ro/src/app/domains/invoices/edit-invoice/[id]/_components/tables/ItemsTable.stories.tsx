import type {Invoice} from "@/types/invoices";
import type {Product} from "@/types/invoices/Product";
import type {Meta, StoryObj} from "@storybook/react";
import {invoicePresets, storyHugeInvoice, storyInvoice, WithEditInvoiceContext, withEntityPreset} from "../../../../_storybook";
import ItemsTable from "./ItemsTable";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * ItemsTable renders a paginated table of invoice line items with editing
 * capabilities.
 */
const meta = {
  title: "arolariu.ro/IMS/Tables/Products/ItemsTable",
  component: ItemsTable,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Paginated table of invoice line items with inline editing, search, category assignment, and delete capabilities. Supports add new item row, bulk select and delete, sort columns, and search within items.",
      },
    },
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {
    invoicePreset: "standard",
    invoice: storyInvoice,
  },
  decorators: [
    withEntityPreset("invoicePreset", "invoice", invoicePresets),
    (Story) => (
      <WithEditInvoiceContext>
        <div style={{padding: "2rem", backgroundColor: "var(--color-background)", minWidth: "800px"}}>
          <Story />
        </div>
      </WithEditInvoiceContext>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Items table with sample products from story invoice. */
export const WithItems: Story = {
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
      ...invoicePresets["standard"],
      items: [],
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state showing no items on the invoice. Displays message encouraging user to add items via the Items dialog.",
      },
    },
  },
};

/** Single item — minimal data edge case. */
export const SingleItem: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).slice(0, 1),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Table with a single product item. Tests sparse table rendering between empty and full states.",
      },
    },
  },
};

/** Two items — minimal viable table. */
export const TwoItems: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).slice(0, 2),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Table with two product items. Verifies layout with minimal viable data set.",
      },
    },
  },
};

/** Huge invoice with 120 items — overflow and pagination test. */
export const HugeInvoice: Story = {
  args: {
    invoice: storyHugeInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Items table with 120 products from huge invoice fixture. Tests pagination, overflow scrolling, search, and rendering performance with large data sets.",
      },
    },
  },
};

/** Item with very long name — text truncation test. */
export const LongItemName: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: [
        {
          ...(invoicePresets["standard"]?.items?.[0] ?? {}),
          name: "Premium Organic Extra Virgin Olive Oil Cold-Pressed First Harvest Limited Edition 750ml Glass Bottle",
        } as Product,
      ],
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Items table with product having an extremely long name. Tests text truncation, ellipsis, and tooltip behavior in table cells without breaking layout.",
      },
    },
  },
};
