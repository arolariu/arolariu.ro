import type {Invoice} from "@/types/invoices";
import type {Product, ProductCategory} from "@/types/invoices/Product";
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

/** Items with soft-deleted rows (strikethrough rendering). */
export const WithSoftDeletedItems: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: [
        ...(invoicePresets["standard"]?.items ?? []).slice(0, 2),
        {
          name: "Removed Product",
          category: 200 as ProductCategory,
          quantity: 1,
          quantityUnit: "pcs",
          productCode: "5900000999999",
          price: 5.5,
          totalPrice: 5.5,
          detectedAllergens: [],
          metadata: {isEdited: false, isComplete: true, isSoftDeleted: true, confidence: 0.9},
        } as Product,
      ],
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with soft-deleted products. Tests strikethrough styling and visual distinction of removed items.",
      },
    },
  },
};

/** Items with zero prices. */
export const WithZeroPriceItems: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).map((item) => ({...item, price: 0, totalPrice: 0})),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with all items having zero price. Tests edge-case number formatting and total calculations.",
      },
    },
  },
};

/** Items with low confidence values (highlighted). */
export const WithLowConfidence: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).map((item) => ({
        ...item,
        metadata: {...item.metadata, confidence: 0.35},
      })),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with low-confidence OCR results. Tests confidence indicator rendering and visual warnings.",
      },
    },
  },
};

/** Items with mixed confidence levels. */
export const WithMixedConfidence: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: [
        ...(invoicePresets["standard"]?.items ?? []).slice(0, 2).map((item) => ({...item, metadata: {...item.metadata, confidence: 0.95}})),
        ...(invoicePresets["standard"]?.items ?? []).slice(2, 4).map((item) => ({...item, metadata: {...item.metadata, confidence: 0.4}})),
      ],
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with mixed confidence levels (high and low). Tests conditional confidence indicator rendering.",
      },
    },
  },
};

/** Items with fractional quantities. */
export const WithFractionalQuantities: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).map((item, idx) => ({
        ...item,
        quantity: idx === 0 ? 2.5 : idx === 1 ? 0.75 : 1.33,
        quantityUnit: idx === 0 ? "kg" : idx === 1 ? "L" : "lb",
      })),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with fractional quantities and varied units. Tests decimal number formatting and unit display.",
      },
    },
  },
};

/** Items with many allergens per product. */
export const WithManyAllergens: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).map((item) => ({
        ...item,
        detectedAllergens: [
          {name: "Lactose", description: "Milk sugar", learnMoreAddress: "https://www.who.int/allergens/lactose"},
          {name: "Gluten", description: "Wheat protein", learnMoreAddress: "https://www.who.int/allergens/gluten"},
          {name: "Nuts", description: "Tree nuts", learnMoreAddress: "https://www.who.int/allergens/nuts"},
          {name: "Soy", description: "Soybean protein", learnMoreAddress: "https://www.who.int/allergens/soy"},
        ],
      })),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with products containing multiple allergens. Tests allergen badge overflow and truncation.",
      },
    },
  },
};

/** Three items — typical small invoice. */
export const ThreeItems: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).slice(0, 3),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with three products. Tests typical small invoice layout and spacing.",
      },
    },
  },
};

/** Items with many categories assigned. */
export const WithVariedCategories: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: (invoicePresets["standard"]?.items ?? []).map((item, idx) => ({
        ...item,
        category: (200 + idx * 100) as ProductCategory,
      })),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Items table with products assigned to different categories. Tests category badge variety and color coding.",
      },
    },
  },
};
