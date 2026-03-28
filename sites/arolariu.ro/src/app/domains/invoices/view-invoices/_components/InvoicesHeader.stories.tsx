import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoicesHeader renders the header for the invoices list page with title,
 * description, and action buttons (import, export, print, new invoice).
 * Depends on `useDialog`.
 *
 * This story renders a static preview of the invoices header.
 */
const meta = {
  title: "Invoices/ViewInvoices/InvoicesHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices header with all action buttons. */
export const Preview: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: "1rem 1.5rem",
      }}>
      <div>
        <h1 style={{fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em"}}>My Invoices</h1>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>View and manage all your invoices</p>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
          }}>
          📤 Import
        </button>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
          }}>
          📥 Export
        </button>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
          }}>
          🖨 Print
        </button>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          ➕ New Invoice
        </button>
      </div>
    </div>
  ),
};
