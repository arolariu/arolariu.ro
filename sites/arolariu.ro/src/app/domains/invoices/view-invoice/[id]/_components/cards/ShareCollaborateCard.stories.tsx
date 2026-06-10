import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice} from "@/data/mocks";
import {LAST_GUID} from "@/lib/utils.generic";
import {ShareCollaborateCard} from "./ShareCollaborateCard";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {DialogProvider} from "../../../../_contexts/DialogContext";

/**
 * Share & Collaborate card for the invoice view page.
 *
 * **Component Description:**
 * Displays invoice sharing status and provides quick actions for collaboration:
 * - Sharing status badge (Private/Shared/Public)
 * - Count of users the invoice is shared with
 * - Public/Private toggle switch
 * - Activity summary (created date, last modified)
 * - "Manage Sharing" button to open the full ShareInvoiceDialog
 *
 * **Sharing Status Logic:**
 * - `sharedWith.length === 0`: Private (TbLock icon)
 * - Last entry is LAST_GUID sentinel: Public (TbWorld icon)
 * - Otherwise: Shared with N people (TbUsers icon)
 *
 * **Context Requirements:**
 * Requires InvoiceContextProvider and DialogContextProvider.
 */
const meta = {
  title: "Invoices/View Invoice/Cards/ShareCollaborateCard",
  component: ShareCollaborateCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Share & Collaborate card displaying invoice sharing status with quick toggle for public/private access. Features activity summary and 'Manage Sharing' button for detailed sharing settings.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ShareCollaborateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Story helper to wrap ShareCollaborateCard with required contexts.
 */
function WithContexts({
  invoice = generateRandomInvoice(),
  merchant = null,
  children,
}: {
  readonly invoice?: ReturnType<typeof generateRandomInvoice>;
  readonly merchant?: null;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DialogProvider>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={merchant}>
        {children}
      </InvoiceContextProvider>
    </DialogProvider>
  );
}

/**
 * Private invoice (not shared with anyone).
 *
 * **Story Description:**
 * Invoice has empty sharedWith array. Displays "Private" badge with lock icon.
 * Public toggle is off.
 */
export const Private: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [];

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Private invoice not shared with anyone. Shows 'Private' badge with lock icon and disabled public toggle.",
      },
    },
  },
};

/**
 * Shared with specific users (3 people).
 *
 * **Story Description:**
 * Invoice is shared with 3 specific users (not public).
 * Displays "Shared" badge with users icon and count.
 */
export const SharedWithUsers: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [
      "user-uuid-1",
      "user-uuid-2",
      "user-uuid-3",
    ];

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice shared with 3 specific users. Displays 'Shared' badge with user count (3 people).",
      },
    },
  },
};

/**
 * Public invoice (accessible to anyone with link).
 *
 * **Story Description:**
 * Invoice has LAST_GUID sentinel in sharedWith array, indicating public access.
 * Displays "Public" badge with world icon. Public toggle is on.
 */
export const Public: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [LAST_GUID];

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Public invoice accessible to anyone with the link. Shows 'Public' badge with world icon and enabled public toggle.",
      },
    },
  },
};

/**
 * Public invoice also shared with specific users.
 *
 * **Story Description:**
 * Invoice is both shared with 2 users AND public (LAST_GUID present).
 * Count shows 2 people (excluding the LAST_GUID sentinel).
 */
export const PublicAndShared: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [
      "user-uuid-1",
      "user-uuid-2",
      LAST_GUID, // Public sentinel at the end
    ];

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice that is both public AND shared with 2 specific users. Shows 'Public' badge and count of 2 people (LAST_GUID not counted).",
      },
    },
  },
};

/**
 * Shared with many users (10+).
 *
 * **Story Description:**
 * Invoice shared with 10 users. Tests layout with larger shared count.
 */
export const SharedWithMany: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = Array(10)
      .fill(null)
      .map((_, i) => `user-uuid-${i + 1}`);

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice shared with 10 users. Tests layout with larger shared user count.",
      },
    },
  },
};

/**
 * Recently created invoice.
 *
 * **Story Description:**
 * Shows relative time formatting for an invoice created moments ago.
 */
export const RecentlyCreated: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [];
    invoice.createdAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    invoice.lastUpdatedAt = new Date(Date.now() - 5 * 60 * 1000);

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Recently created invoice (5 minutes ago). Demonstrates relative time formatting in the activity summary.",
      },
    },
  },
};

/**
 * Invoice created long ago with recent modification.
 *
 * **Story Description:**
 * Invoice created weeks ago but modified recently. Shows both timestamps.
 */
export const OldInvoiceRecentUpdate: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = ["user-uuid-1"];
    invoice.createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    invoice.lastUpdatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice created 30 days ago but modified 2 hours ago. Activity summary shows both timestamps with relative formatting.",
      },
    },
  },
};

/**
 * Invoice never modified since creation.
 *
 * **Story Description:**
 * Created and last modified timestamps are identical.
 */
export const NeverModified: Story = {
  render: () => {
    const invoice = generateRandomInvoice();
    invoice.sharedWith = [];
    const timestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    invoice.createdAt = timestamp;
    invoice.lastUpdatedAt = timestamp;

    return (
      <WithContexts invoice={invoice}>
        <ShareCollaborateCard />
      </WithContexts>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice created 7 days ago with no modifications since. Created and modified timestamps are identical.",
      },
    },
  },
};
