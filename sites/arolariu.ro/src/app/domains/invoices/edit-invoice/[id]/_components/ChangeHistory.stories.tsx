import type {Meta, StoryObj} from "@storybook/react";
import {WithEditInvoiceContext, storyInvoice} from "@/app/domains/invoices/_storybook";
import ChangeHistory from "./ChangeHistory";

/**
 * Change history timeline component showing invoice modification history.
 *
 * **Component Description:**
 * Displays a chronological timeline of invoice changes, including creation date
 * and last modified timestamp. The component reads from EditInvoiceContext to
 * detect pending changes (when user modifies fields but hasn't saved yet).
 *
 * **Features:**
 * - Timeline visualization with icons for different change types
 * - Relative time formatting (e.g., "2 minutes ago")
 * - Automatic category label transformation
 * - Badge indicator for unsaved changes (when pendingChanges exist)
 *
 * **Context Requirements:**
 * Requires EditInvoiceContextProvider with invoice data.
 *
 * **Note on Pending Changes:**
 * This component displays pending changes from EditInvoiceContext when users
 * interact with form fields in the edit page. Stories show the timeline with
 * creation/modification history. Pending changes are managed by the real
 * EditInvoiceContext during actual editing sessions.
 */
const meta = {
  title: "arolariu.ro/IMS/EditInvoice/Components/ChangeHistory",
  component: ChangeHistory,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Timeline component displaying invoice modification history from EditInvoiceContext. Shows creation date and last modified timestamp. Pending changes appear when users modify fields in the edit page.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChangeHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state showing a newly created invoice with no modifications.
 *
 * **Story Description:**
 * Displays the minimal timeline with only the creation timestamp.
 * No pending changes or modification history since the invoice is fresh.
 */
export const Default: Story = {
  render: () => (
    <WithEditInvoiceContext>
      <ChangeHistory />
    </WithEditInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default timeline showing only the invoice creation timestamp. The invoice has no modification history.",
      },
    },
  },
};

/**
 * Invoice with previous modifications (lastUpdatedAt differs from createdAt).
 *
 * **Story Description:**
 * Shows the timeline with creation date and a "last modified" entry,
 * indicating the invoice has been saved after creation.
 */
export const WithPreviousModifications: Story = {
  render: () => {
    const invoice = {
      ...storyInvoice,
      lastUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      numberOfUpdates: 3,
    };
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Timeline showing creation date and last modified entry. The invoice was most recently modified 2 hours ago.",
      },
    },
  },
};

/**
 * Invoice with a long modification history.
 *
 * **Story Description:**
 * Shows an invoice that was created long ago and has been
 * modified, with a significant time span between creation and last modification.
 */
export const LongHistory: Story = {
  render: () => {
    const invoice = {
      ...storyInvoice,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      numberOfUpdates: 12,
    };
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Timeline for an older invoice created 30 days ago with last modified entry from 1 hour ago, demonstrating a long time span between creation and most recent modification.",
      },
    },
  },
};

/**
 * Recently created invoice (moments ago).
 *
 * **Story Description:**
 * Shows relative time formatting for a very recent invoice
 * (created within the last few minutes).
 */
export const RecentlyCreated: Story = {
  render: () => {
    const invoice = {
      ...storyInvoice,
      createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      lastUpdatedAt: new Date(Date.now() - 2 * 60 * 1000),
      numberOfUpdates: 0,
    };
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Timeline for a brand new invoice created just 2 minutes ago. Demonstrates relative time formatting for very recent timestamps.",
      },
    },
  },
};

/**
 * Invoice never modified since creation.
 *
 * **Story Description:**
 * Created and last modified timestamps are identical,
 * showing a single timeline entry.
 */
export const NeverModified: Story = {
  render: () => {
    const timestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const invoice = {
      ...storyInvoice,
      createdAt: timestamp,
      lastUpdatedAt: timestamp,
      numberOfUpdates: 0,
    };
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice created 7 days ago with no modifications since. The creation and last modified timestamps match, showing a single timeline entry.",
      },
    },
  },
};

/**
 * Grocery invoice with category and metadata.
 *
 * **Story Description:**
 * Timeline for a typical grocery invoice showing creation and last modified entry.
 */
export const GroceryInvoice: Story = {
  render: () => {
    const invoice = {
      ...storyInvoice,
      name: "Grocery Store Receipt",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      lastUpdatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      numberOfUpdates: 2,
    };
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Timeline for a grocery invoice created 5 days ago with last modified entry from 3 days ago.",
      },
    },
  },
};
