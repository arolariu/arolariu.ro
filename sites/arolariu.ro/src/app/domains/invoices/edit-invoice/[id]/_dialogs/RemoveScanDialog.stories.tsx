import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the RemoveScanDialog component.
 *
 * @remarks Static preview — component imports "use server" action (deleteInvoiceScan
 * from `@/lib/actions/invoices/deleteInvoiceScan`) that cannot be bundled by
 * Storybook's Vite/Rollup. Also depends on `useDialog` context. This story renders
 * a faithful HTML replica of the scan removal confirmation dialog with image preview.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RemoveScanDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default remove scan confirmation dialog. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          <TbAlertTriangle style={{height: "1.25rem", width: "1.25rem", color: "#ef4444"}} />
          Remove Scan
        </h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Remove scan 2 of 3 from this invoice.</p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        {/* Scan Preview */}
        <div style={{overflow: "hidden", borderRadius: "0.5rem", border: "1px solid #e5e7eb"}}>
          <div style={{display: "flex", aspectRatio: "4/3", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6"}}>
            <img
              src='https://picsum.photos/seed/removescan/400/300'
              alt='Scan to remove'
              style={{height: "100%", width: "100%", objectFit: "cover"}}
            />
          </div>
        </div>
        <p style={{textAlign: "center", fontSize: "0.75rem", color: "#6b7280"}}>Scan 2 of 3</p>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
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
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbTrash style={{height: "1rem", width: "1rem"}} />
          Remove
        </button>
      </div>
    </div>
  ),
};
