import type {Meta, StoryObj} from "@storybook/react";
import {setupEditInvoiceStory, storyInvoice, storyMerchant, WithEditInvoiceContext} from "@/app/domains/invoices/_storybook";
import InvoiceCard from "./InvoiceCard";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * This story mounts the real component wrapped in `WithEditInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Comprehensive invoice details card for the edit page. Displays merchant info, date, category, payment type, total, " +
          "currency, importance flag, and optional notes. Enables inline editing of invoice metadata via context-provided callbacks. " +
          "Mounted with real EditInvoiceContext provider.",
      },
    },
  },
  beforeEach: () => {
    setupEditInvoiceStory({invoice: storyInvoice, merchant: storyMerchant});
  },
} satisfies Meta<typeof InvoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoice card with standard invoice data. */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default state with realistic invoice fixture showing merchant 'Corner Shop ABC', category 'Groceries', " +
          "payment type 'Card', and formatted total. Displays all editable fields with standard styling.",
      },
    },
  },
  render: () => (
    <WithEditInvoiceContext invoice={storyInvoice} merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Important invoice card with isImportant flag set. */
export const ImportantInvoice: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Variant with `isImportant: true` flag enabled. Displays enhanced visual indicators (star icon, accent color) " +
          "to highlight high-priority or bookmarked invoices in the edit interface.",
      },
    },
  },
  render: () => (
    <WithEditInvoiceContext
      invoice={{...storyInvoice, isImportant: true}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice whose merchant has a very long name to exercise truncation/wrapping. */
export const LongMerchantName: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyInvoice}
      merchant={{
        ...storyMerchant,
        name: "Corner Shop ABC International Wholesale & Retail Distribution Center Bucuresti Militari Branch",
      }}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with only the minimal fields populated (no description, recipes, or importance). */
export const MinimalFields: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={{...storyInvoice, description: "", isImportant: false, possibleRecipes: []}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice categorised differently to show category-dependent presentation. */
export const DifferentCategory: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={{...storyInvoice, category: 200 as typeof storyInvoice.category}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};
