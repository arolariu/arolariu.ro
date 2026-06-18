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
