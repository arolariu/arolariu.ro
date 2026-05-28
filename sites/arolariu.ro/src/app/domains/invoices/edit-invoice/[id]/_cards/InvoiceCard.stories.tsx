import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * Because it depends on `useEditInvoiceContext`, this story renders a
 * **static preview** of the card layout with mock invoice data.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/InvoiceCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the editable invoice card. */
export const Preview: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{display: "flex", flexDirection: "column", gap: "0.25rem", borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Invoice Details</h3>
          <span
            style={{
              cursor: "pointer",
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
            }}>
            ♡ Mark Important
          </span>
        </div>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>From: Mock Merchant • Weekly grocery shopping</p>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem"}}>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem"}}>
          <div>
            <h4 style={{fontSize: "0.75rem", fontWeight: 500, color: "#6b7280"}}>Date (UTC)</h4>
            <p style={{fontSize: "0.875rem"}}>📅 January 15, 2025, 10:30 AM</p>
          </div>
          <div>
            <h4 style={{fontSize: "0.75rem", fontWeight: 500, color: "#6b7280"}}>Category</h4>
            <p style={{fontSize: "0.875rem"}}>🏷 GROCERIES</p>
          </div>
          <div>
            <h4 style={{fontSize: "0.75rem", fontWeight: 500, color: "#6b7280"}}>Payment Method</h4>
            <p style={{fontSize: "0.875rem"}}>💳 CREDIT CARD</p>
          </div>
          <div>
            <h4 style={{fontSize: "0.75rem", fontWeight: 500, color: "#6b7280"}}>Total Amount</h4>
            <p style={{fontSize: "1.125rem", fontWeight: 700, color: "#16a34a"}}>$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Items (3)</h4>
          <table style={{width: "100%", fontSize: "0.875rem"}}>
            <thead>
              <tr style={{borderBottom: "1px solid #e5e7eb", textAlign: "left", fontSize: "0.75rem", color: "#6b7280"}}>
                <th style={{paddingBottom: "0.5rem"}}>Item</th>
                <th style={{paddingBottom: "0.5rem", textAlign: "right"}}>Qty</th>
                <th style={{paddingBottom: "0.5rem", textAlign: "right"}}>Price</th>
                <th style={{paddingBottom: "0.5rem", textAlign: "right"}}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{borderBottom: "1px solid #e5e7eb"}}>
                <td style={{padding: "0.5rem 0"}}>Organic Milk</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>2</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>$3.99</td>
                <td style={{padding: "0.5rem 0", textAlign: "right", fontWeight: 500}}>$7.98</td>
              </tr>
              <tr style={{borderBottom: "1px solid #e5e7eb"}}>
                <td style={{padding: "0.5rem 0"}}>Whole Wheat Bread</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>1</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>$4.50</td>
                <td style={{padding: "0.5rem 0", textAlign: "right", fontWeight: 500}}>$4.50</td>
              </tr>
              <tr style={{borderBottom: "1px solid #e5e7eb"}}>
                <td style={{padding: "0.5rem 0"}}>Fresh Salmon</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>0.5 kg</td>
                <td style={{padding: "0.5rem 0", textAlign: "right"}}>$12.00</td>
                <td style={{padding: "0.5rem 0", textAlign: "right", fontWeight: 500}}>$6.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ),
};
