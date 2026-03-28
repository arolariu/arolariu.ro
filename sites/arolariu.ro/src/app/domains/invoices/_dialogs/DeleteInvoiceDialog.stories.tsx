import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbFileX, TbPhoto, TbReceipt, TbShoppingCart, TbTrash, TbX} from "react-icons/tb";

/**
 * Static visual preview of the DeleteInvoiceDialog component.
 *
 * @remarks Static preview — component imports "use server" action (deleteInvoice
 * from `@/lib/actions/invoices/deleteInvoice`) that cannot be bundled by Storybook's
 * Vite/Rollup. Also depends on `useDialog` context and Zustand stores. This story
 * renders a faithful HTML replica of the confirmation dialog with impact summary.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteInvoiceDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default delete confirmation dialog with invoice summary and impact warning. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: "600", color: "#dc2626"}}>
          <TbTrash style={{height: "1.25rem", width: "1.25rem"}} />
          Delete Invoice
        </h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
          This action cannot be undone. The invoice and all associated data will be permanently removed.
        </p>
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem"}}>
        {/* Invoice Summary Card */}
        <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", padding: "1rem"}}>
          <div style={{display: "flex", alignItems: "flex-start", gap: "0.75rem"}}>
            <div
              style={{
                display: "flex",
                height: "2.5rem",
                width: "2.5rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.5rem",
                backgroundColor: "#fee2e2",
              }}>
              <TbReceipt style={{height: "1.25rem", width: "1.25rem", color: "#dc2626"}} />
            </div>
            <div>
              <p style={{fontWeight: "500"}}>Weekly Groceries</p>
              <p style={{fontSize: "0.75rem", color: "#6b7280"}}>a1b2c3d4-e5f6-7890-abcd-ef1234567890</p>
              <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#4b5563"}}>Shopping at Lidl — weekly grocery run</p>
            </div>
          </div>
        </div>

        {/* Deletion Impact Warning */}
        <div style={{borderRadius: "0.5rem", border: "1px solid #fecaca", backgroundColor: "#fef2f2", padding: "1rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbAlertTriangle style={{height: "1rem", width: "1rem", color: "#dc2626"}} />
            <h4 style={{fontSize: "0.875rem", fontWeight: "600", color: "#991b1b"}}>Deletion Impact</h4>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#b91c1c"}}>The following data will be permanently deleted:</p>
          <ul style={{marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem"}}>
            <li style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#b91c1c"}}>
              <TbFileX style={{height: "0.875rem", width: "0.875rem"}} />
              Invoice record and all metadata
            </li>
            <li style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#b91c1c"}}>
              <TbPhoto style={{height: "0.875rem", width: "0.875rem"}} />3 uploaded scans
            </li>
            <li style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#b91c1c"}}>
              <TbShoppingCart style={{height: "0.875rem", width: "0.875rem"}} />
              12 line items
            </li>
            <li style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#b91c1c"}}>
              <TbX style={{height: "0.875rem", width: "0.875rem"}} />2 shared access entries revoked
            </li>
          </ul>
        </div>

        <hr style={{borderColor: "#e5e7eb"}} />

        {/* Confirmation Input */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          <div>
            <label style={{fontSize: "0.875rem", fontWeight: "500"}}>
              Type <span style={{fontWeight: "600", color: "#dc2626"}}>Weekly Groceries</span> to confirm
            </label>
            <input
              style={{
                marginTop: "0.25rem",
                width: "100%",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "transparent",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                fontSize: "0.875rem",
                outline: "none",
              }}
              placeholder='Weekly Groceries'
              readOnly
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              padding: "0.75rem",
            }}>
            <input
              type='checkbox'
              style={{marginTop: "0.125rem", height: "1rem", width: "1rem", borderRadius: "0.25rem", border: "1px solid #e5e7eb"}}
              readOnly
            />
            <div>
              <p style={{fontSize: "0.875rem", lineHeight: "1", fontWeight: "500"}}>I understand this action is irreversible</p>
              <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>
                All invoice data, scans, and shared access will be permanently deleted.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            backgroundColor: "transparent",
            cursor: "pointer",
          }}>
          Cancel
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#dc2626",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#ffffff",
            opacity: 0.5,
            border: "none",
            cursor: "not-allowed",
          }}
          disabled>
          <TbTrash style={{height: "1rem", width: "1rem"}} />
          Delete Permanently
        </button>
      </div>
    </div>
  ),
};
