import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantCard (edit) displays merchant information with navigation buttons
 * to view merchant details and receipt history.
 *
 * Because it depends on `useDialog`, this story renders a static preview.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/MerchantCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the merchant card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Merchant Info</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div
            style={{
              display: "flex",
              height: "2.5rem",
              width: "2.5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              backgroundColor: "#dbeafe",
            }}>
            🛒
          </div>
          <div>
            <p style={{fontWeight: 500}}>Kaufland</p>
            <p style={{fontSize: "0.875rem", color: "#6b7280"}}>123 Main Street, Bucharest</p>
          </div>
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <button
            type='button'
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}>
            <span>View Merchant Details</span>
            <span>→</span>
          </button>
          <button
            type='button'
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}>
            <span>🛍 View All Receipts</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  ),
};
