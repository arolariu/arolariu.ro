import type {Meta, StoryObj} from "@storybook/react";
import InvoiceCard from "./InvoiceCard";
import {storyInvoice, storyMerchant, WithEditInvoiceContext} from "../../../_storybook";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * This story mounts the real component wrapped in `WithEditInvoiceContext`.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/InvoiceCard",
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
} satisfies Meta<typeof InvoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoice card with standard invoice data. */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default state with realistic invoice fixture showing merchant 'Fresh Market', category 'Groceries', " +
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
