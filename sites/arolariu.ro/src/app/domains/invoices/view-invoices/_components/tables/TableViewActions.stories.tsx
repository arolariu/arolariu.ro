import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyOnlineInvoice, WithInvoiceDialogs} from "../../../_storybook";
import TableViewActions from "./TableViewActions";

/**
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows. Depends on
 * `useDialog` context and `useTranslations`.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableViewActions",
  component: TableViewActions,
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <div style={{display: "flex", minHeight: "200px", alignItems: "flex-start", justifyContent: "center", paddingTop: "2rem"}}>
          <Story />
        </div>
      </WithInvoiceDialogs>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dropdown menu for invoice row actions in table view. Provides Edit (navigate to edit page), Share (open share dialog), and Delete (confirmation dialog) options. Uses DialogContext for share and delete interactions and navigation hooks.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TableViewActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default invoice actions dropdown with standard invoice data.
 * Shows Edit, Share, and Delete options for local/offline invoice.
 */
export const Default: Story = {
  args: {
    invoice: storyInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Standard invoice actions menu. Edit navigates to /domains/invoices/edit-invoice/[id], Share opens share dialog via DialogContext, Delete opens confirmation dialog via DialogContext.",
      },
    },
  },
};

/**
 * Online invoice actions dropdown (invoice from online merchant/source).
 * Uses online invoice fixture to demonstrate any conditional behavior.
 */
export const OnlineInvoice: Story = {
  args: {
    invoice: storyOnlineInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Actions menu for online invoice (from online merchant). Same Edit/Share/Delete options as standard invoice. Demonstrates component behavior with online invoice metadata.",
      },
    },
  },
};
