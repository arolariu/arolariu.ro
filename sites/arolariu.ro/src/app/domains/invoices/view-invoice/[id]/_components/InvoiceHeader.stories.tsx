import {storyInvoice, storyMerchant, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceHeader} from "./InvoiceHeader";

const ownerInvoice = {
  ...storyInvoice,
  id: "invoice-story-owner-header",
  userIdentifier: "user_storybook",
  isImportant: true,
};

const guestInvoice = {
  ...storyInvoice,
  id: "invoice-story-guest-header",
  name: "Shared invoice header",
  userIdentifier: "user_different",
  isImportant: false,
};

const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/ViewInvoiceHeader",
  component: InvoiceHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Mounts the real view-invoice header with ViewInvoiceContext, DialogContext, and the Storybook user-information mock.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InvoiceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnerView: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={ownerInvoice}
      merchant={storyMerchant}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Real header for an invoice owned by the mocked Storybook user, showing edit, delete, print, and export actions.",
      },
    },
  },
};

export const GuestView: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={guestInvoice}
      merchant={storyMerchant}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Real header for a shared invoice owned by another user, hiding owner-only edit and delete actions while keeping print/export actions.",
      },
    },
  },
};

/** Important invoice — flagged for attention. */
export const ImportantInvoice: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{...ownerInvoice, isImportant: true}}
      merchant={storyMerchant}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Header for an invoice marked as important. Tests important flag indicator rendering and visual prominence.",
      },
    },
  },
};

/** Invoice with very long name — text overflow test. */
export const LongInvoiceName: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...ownerInvoice,
        name: "Monthly Grocery Shopping Including Fresh Produce, Dairy Products, Beverages, Household Cleaning Supplies and Personal Care Items from Multiple Stores",
      }}
      merchant={storyMerchant}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Header with very long invoice name. Tests text truncation, wrapping, and layout resilience with extended titles.",
      },
    },
  },
};

/** Soft-deleted invoice — archived state. */
export const SoftDeleted: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{...ownerInvoice, isSoftDeleted: true}}
      merchant={storyMerchant}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Header for a soft-deleted (archived) invoice. Tests deleted state indicator and action availability.",
      },
    },
  },
};

/** Invoice with no merchant data — minimal context. */
export const NoMerchant: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={ownerInvoice}
      merchant={null}>
      <InvoiceHeader />
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Header when merchant information is unavailable. Tests graceful handling of missing merchant data.",
      },
    },
  },
};
