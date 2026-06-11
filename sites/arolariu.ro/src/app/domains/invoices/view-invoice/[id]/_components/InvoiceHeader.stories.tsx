import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceHeader (view) displays the invoice title, importance badge,
 * and action buttons (edit, delete, print). Depends on `useInvoiceContext`,
 * `useUserInformation`, and `useDialog`.
 *
 * **Static Preview Rationale:**
 * This story renders a static HTML replica instead of mounting the real component because
 * `useUserInformation` hook depends on Clerk authentication state (useUser, useAuth),
 * which requires full app initialization and cannot be isolated in Storybook.
 * `useInvoiceContext` and `useDialog` are available via `WithViewInvoiceContext`, but
 * mocking Clerk's authentication hooks would require deep provider stubs that are fragile
 * and would not accurately represent production behavior.
 *
 * The static preview demonstrates the visual layout for owner and guest views without
 * requiring authentication infrastructure.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceHeader",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "**Static Preview:** Displays invoice title, importance indicator, and action buttons (edit, delete, export, print). " +
          "**Blocker:** Component depends on `useUserInformation` hook which requires Clerk authentication (useUser, useAuth) that cannot " +
          "be mocked in Storybook without fragile deep provider stubs. Static HTML preview demonstrates visual layout for owner and guest views.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Owner view — edit and delete buttons visible. */
export const OwnerView: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Static preview of the header when the current user owns the invoice. Shows all action buttons: Edit, Delete, Print, and Export. " +
          "Displays importance badge when `invoice.isImportant` is true.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingTop: "1rem",
        paddingBottom: "1rem",
      }}>
      <div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <h1 style={{fontSize: "1.875rem", fontWeight: "bold", letterSpacing: "-0.025em"}}>Weekly Grocery Shopping</h1>
          <span title='Important invoice'>❤️</span>
        </div>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890</p>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          ✏️ Edit
        </button>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#dc2626",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          🗑 Delete
        </button>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          🖨 Print
        </button>
      </div>
    </div>
  ),
};

/** Guest view — only print button visible. */
export const GuestView: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Static preview of the header when the current user is viewing a shared invoice they do not own. " +
          "Only shows Print and Export buttons; Edit and Delete are hidden for non-owners.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingTop: "1rem",
        paddingBottom: "1rem",
      }}>
      <div>
        <h1 style={{fontSize: "1.875rem", fontWeight: "bold", letterSpacing: "-0.025em"}}>Shared Invoice</h1>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>ID: xyz-shared-invoice-id</p>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
          }}>
          🖨 Print
        </button>
      </div>
    </div>
  ),
};
