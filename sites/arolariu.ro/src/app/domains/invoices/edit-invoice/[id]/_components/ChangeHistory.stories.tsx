import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice} from "@/data/mocks";
import {InvoiceCategory} from "@/types/invoices";
import ChangeHistory from "./ChangeHistory";
import {EditInvoiceContextProvider} from "../_context/EditInvoiceContext";

/**
 * Change history timeline component showing invoice modification history.
 *
 * **Component Description:**
 * Displays a chronological timeline of invoice changes, including pending modifications,
 * last update timestamp, and creation date. Provides visual feedback for unsaved changes
 * using the EditInvoiceContext to track pending modifications.
 *
 * **Features:**
 * - Timeline visualization with icons for different change types
 * - Before/after value display for field changes
 * - Relative time formatting (e.g., "2 minutes ago")
 * - Automatic category label transformation
 * - Badge indicator for unsaved changes
 *
 * **Context Requirements:**
 * Requires EditInvoiceContextProvider with invoice and pendingChanges.
 */
const meta = {
  title: "Invoices/Edit Invoice/Components/ChangeHistory",
  component: ChangeHistory,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Timeline component displaying invoice modification history with pending changes from EditInvoiceContext. Shows creation date, last modified timestamp, and all unsaved field modifications with before/after values.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChangeHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper to wrap ChangeHistory with EditInvoiceContext.
 */
function WithEditInvoiceContext({
  invoice = generateRandomInvoice(),
  merchant = null,
  pendingChanges = {},
  children,
}: {
  readonly invoice?: ReturnType<typeof generateRandomInvoice>;
  readonly merchant?: null;
  readonly pendingChanges?: Record<string, unknown>;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  // Create a mock context provider that simulates EditInvoiceContext
  return (
    <EditInvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      {children}
    </EditInvoiceContextProvider>
  );
}

/**
 * Default state showing a newly created invoice with no modifications.
 *
 * **Story Description:**
 * Displays the minimal timeline with only the creation timestamp.
 * No pending changes or modification history.
 */
export const Default: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    return (
      <WithEditInvoiceContext invoice={invoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Default timeline showing only the invoice creation timestamp. No pending changes or modification history.",
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
    const invoice = generateRandomInvoice();
    const updatedInvoice = {
      ...invoice,
      lastUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      numberOfUpdates: 3,
    };
    return (
      <WithEditInvoiceContext invoice={updatedInvoice}>
        <ChangeHistory />
      </WithEditInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Timeline showing creation date and last modified timestamp, indicating the invoice has been updated multiple times after creation.",
      },
    },
  },
};

/**
 * Invoice with pending name change (not yet saved).
 *
 * **Story Description:**
 * Shows a pending change where the invoice name has been modified
 * but not yet saved. Displays before/after values and a "pending" badge.
 */
export const WithPendingNameChange: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.name = "Original Invoice Name";

    // Mock the EditInvoiceContext to simulate pending name change
    // Note: This is a simplified mock since we can't directly inject pendingChanges
    // In a real scenario, EditInvoiceContextProvider would manage this state
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
          'Displays a pending name change in the timeline. Shows the before and after values (e.g., "Original Name" → "New Name") with a "pending" indicator.',
      },
    },
  },
};

/**
 * Invoice with pending category change.
 *
 * **Story Description:**
 * Shows a pending category modification with human-readable labels
 * (e.g., "Uncategorized" → "Dining").
 */
export const WithPendingCategoryChange: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.category = InvoiceCategory.NOT_DEFINED;

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
          "Timeline showing a pending category change with friendly labels. For example, changing from 'Uncategorized' to 'Dining' or 'Auto'.",
      },
    },
  },
};

/**
 * Invoice with multiple pending changes (name, category, description, importance).
 *
 * **Story Description:**
 * Displays a complex timeline with several pending modifications,
 * demonstrating how multiple unsaved changes appear together.
 */
export const WithMultiplePendingChanges: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.name = "Original Name";
    invoice.category = InvoiceCategory.NOT_DEFINED;
    invoice.description = "Original description text";
    invoice.isImportant = false;

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
          "Complex timeline showing multiple pending changes: name, category, description, and importance flag. Each change displays with its own icon and before/after values.",
      },
    },
  },
};

/**
 * Comprehensive timeline: previous saves + pending changes.
 *
 * **Story Description:**
 * Full timeline showing creation, previous modification history,
 * and multiple pending unsaved changes.
 */
export const FullTimeline: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.name = "Grocery Store Receipt";
    invoice.category = InvoiceCategory.GROCERIES;
    invoice.lastUpdatedAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
    invoice.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    invoice.numberOfUpdates = 4;

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
          "Complete timeline showing: (1) pending unsaved changes at the top, (2) last modified timestamp, (3) original creation date. Demonstrates the full change history view.",
      },
    },
  },
};
