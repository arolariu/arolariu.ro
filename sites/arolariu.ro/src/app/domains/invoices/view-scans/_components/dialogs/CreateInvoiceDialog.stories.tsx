import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowRight, TbFileInvoice, TbPhoto, TbSparkles, TbStack2} from "react-icons/tb";

/**
 * Static visual preview of the CreateInvoiceDialog component.
 *
 * @remarks Static preview — component imports from `@/stores` barrel which includes
 * `preferencesStore` that imports "use server" action (setCookie) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useDialog` context and Zustand stores.
 * This story renders a faithful HTML replica of the creation wizard's selection step.
 */
const meta = {
  title: "Invoices/ViewScans/Dialogs/CreateInvoiceDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default wizard selection step with scan previews and mode options. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", backgroundColor: "white", boxShadow: "0 20px 25px rgba(0,0,0,0.1)"}}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          <TbFileInvoice style={{height: "1.25rem", width: "1.25rem", color: "#a855f7"}} />
          Create Invoices
        </h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Choose how to create invoices from your scans.</p>
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem"}}>
        {/* Scans Preview */}
        <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", padding: "0.75rem"}}>
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem"}}>
            <span style={{fontWeight: 500}}>Selected Scans (3)</span>
            <span style={{color: "#6b7280"}}>2.4 MB total</span>
          </div>
          <div style={{marginTop: "0.5rem", display: "flex", gap: "0.5rem"}}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{display: "flex", height: "3.5rem", width: "3.5rem", alignItems: "center", justifyContent: "center", borderRadius: "0.375rem", border: "1px solid #e5e7eb", backgroundColor: "white"}}>
                <TbPhoto style={{height: "1.5rem", width: "1.5rem", color: "#d1d5db"}} />
              </div>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <p style={{fontSize: "0.875rem", fontWeight: 500}}>Choose creation mode:</p>

          {/* Single mode */}
          <label style={{display: "flex", cursor: "pointer", alignItems: "flex-start", gap: "0.75rem", borderRadius: "0.5rem", border: "2px solid #a855f7", backgroundColor: "#faf5ff", padding: "0.75rem"}}>
            <input
              type='radio'
              style={{marginTop: "0.125rem"}}
              checked
              readOnly
            />
            <div>
              <span style={{display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500}}>
                <TbPhoto style={{height: "1rem", width: "1rem", color: "#a855f7"}} />
                One invoice per scan
              </span>
              <p style={{marginTop: "0.125rem", fontSize: "0.75rem", color: "#6b7280"}}>Creates 3 separate invoices, one for each scan.</p>
            </div>
          </label>

          {/* Batch mode */}
          <label style={{display: "flex", cursor: "pointer", alignItems: "flex-start", gap: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem"}}>
            <input
              type='radio'
              style={{marginTop: "0.125rem"}}
              readOnly
            />
            <div>
              <span style={{display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500}}>
                <TbStack2 style={{height: "1rem", width: "1rem", color: "#3b82f6"}} />
                Combine into one invoice
              </span>
              <p style={{marginTop: "0.125rem", fontSize: "0.75rem", color: "#6b7280"}}>Merges all 3 scans into a single invoice.</p>
            </div>
          </label>
        </div>

        {/* Single scan info */}
        <div style={{borderRadius: "0.5rem", border: "1px solid #e9d5ff", backgroundColor: "#faf5ff", padding: "0.75rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbSparkles style={{height: "1rem", width: "1rem", color: "#a855f7"}} />
            <div>
              <p style={{fontSize: "0.875rem", fontWeight: 500, color: "#6b21a8"}}>AI-Powered Processing</p>
              <p style={{fontSize: "0.75rem", color: "#9333ea"}}>Each scan will be analyzed with OCR and categorization.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem"}}>Cancel</button>
        <button style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", backgroundImage: "linear-gradient(to right, #9333ea, #db2777)", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", color: "white"}}>
          Create 3 Invoices
          <TbArrowRight style={{height: "1rem", width: "1rem"}} />
        </button>
      </div>
    </div>
  ),
};
