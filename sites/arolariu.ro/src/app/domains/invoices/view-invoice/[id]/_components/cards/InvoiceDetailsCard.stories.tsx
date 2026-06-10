import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice, storyMerchant, storyOnlineInvoice} from "../../../../_storybook";
import {InvoiceDetailsCard} from "./InvoiceDetailsCard";

const emptyInvoice = {
  ...storyInvoice,
  id: "invoice-story-empty-items",
  name: "Empty items invoice",
  description: "Invoice with no extracted line items",
  items: [],
  isImportant: false,
} as const;

const meta = {
  title: "Invoices/ViewInvoice/Cards/InvoiceDetails",
  component: InvoiceDetailsCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Renders the real invoice details card inside the view-invoice context provider.",
      },
    },
  },
} satisfies Meta<typeof InvoiceDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StandardInvoice: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice} merchant={storyMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows date, category, payment, totals, tax, and line items for a typical invoice.",
      },
    },
  },
};

export const ForeignCurrencyInvoice: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyOnlineInvoice} merchant={storyMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the non-RON currency path including the RON equivalent display.",
      },
    },
  },
};

export const EmptyLineItems: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={emptyInvoice} merchant={storyMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the real card when no products were extracted from the invoice.",
      },
    },
  },
};
