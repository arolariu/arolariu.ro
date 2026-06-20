import type {Meta, StoryObj} from "@storybook/react";
import {
  storyDeletedInvoice,
  storyEurInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyOnlineInvoice,
  storyUsdInvoice,
  WithInvoiceDialogs,
} from "../../../_storybook";
import TableViewActions from "./TableViewActions";

/**
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows. Depends on
 * `useDialog` context and `useTranslations`.
 */
const meta = {
  title: "arolariu.ro/IMS/Views/TableViewActions",
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
          "Dropdown menu for invoice row actions in table view. Provides Edit as a link to the edit page, plus Share and Delete actions that dispatch DialogContext state; dialog content is covered by dedicated dialog stories.",
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
          "Standard invoice actions menu. Edit links to /domains/invoices/edit-invoice/[id], while Share and Delete dispatch DialogContext state without rendering dialog content in this isolated menu story.",
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

/**
 * Invoice actions dropdown with very long invoice name.
 * Tests text truncation and tooltip behavior in menu items.
 */
export const LongInvoiceName: Story = {
  args: {
    invoice: storyLongNameInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Actions menu for invoice with extremely long name. Tests text truncation, ellipsis, and tooltip rendering in menu items without breaking dropdown layout.",
      },
    },
  },
};

/** Actions menu for soft-deleted invoice. */
export const SoftDeletedInvoice: Story = {
  args: {
    invoice: storyDeletedInvoice,
  },
};

/** Actions menu for EUR currency invoice. */
export const EurInvoice: Story = {
  args: {
    invoice: storyEurInvoice,
  },
};

/** Actions menu for USD currency invoice. */
export const UsdInvoice: Story = {
  args: {
    invoice: storyUsdInvoice,
  },
};
