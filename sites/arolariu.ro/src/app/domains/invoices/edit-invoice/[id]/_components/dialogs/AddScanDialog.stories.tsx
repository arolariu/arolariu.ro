import type {Meta, StoryObj} from "@storybook/react";
import {TbCloudUpload, TbUpload} from "react-icons/tb";

/**
 * Static visual preview of the AddScanDialog component.
 *
 * @remarks Static preview — component imports "use server" actions (attachInvoiceScan,
 * createInvoiceScan from `@/lib/actions/invoices/`) that cannot be bundled by
 * Storybook's Vite/Rollup. Also depends on `useDialog` context and react-dropzone.
 * This story renders a faithful HTML replica of the upload dialog with dropzone.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AddScanDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default upload dialog with empty dropzone. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius:"0.75rem", border:"1px solid #e5e7eb", backgroundColor:"#fff", boxShadow:"0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)"}}>
      {/* Header */}
      <div style={{borderBottom:"1px solid #e5e7eb", padding:"1.5rem"}}>
        <h2 style={{fontSize:"1.125rem", fontWeight:600}}>Add Scan</h2>
        <p style={{marginTop:"0.25rem", fontSize:"0.875rem", color:"#6b7280"}}>Upload a new receipt scan to this invoice.</p>
      </div>

      <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem"}}>
        {/* Dropzone */}
        <div style={{display:"flex", cursor:"pointer", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:"0.5rem", border:"2px solid", borderStyle:"dashed", borderColor:"#d1d5db", transition:"color 150ms,background-color 150ms,border-color 150ms"}}>
          <TbCloudUpload style={{height:"2.5rem", width:"2.5rem", color:"#9ca3af"}} />
          <p style={{marginTop:"0.5rem", fontSize:"0.875rem", fontWeight:500, color:"#4b5563"}}>Drag &amp; drop your file here</p>
          <p style={{fontSize:"0.75rem", color:"#6b7280"}}>or click to browse</p>
          <p style={{marginTop:"0.5rem", fontSize:"0.75rem", color:"#9ca3af"}}>Supports: JPEG, PNG, PDF (max 10MB)</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{display:"flex", justifyContent:"flex-end", gap:"0.5rem", borderTop:"1px solid #e5e7eb", padding:"1rem"}}>
        <button style={{borderRadius:"0.375rem", border:"1px solid #e5e7eb", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem"}}>Cancel</button>
        <button
          style={{display:"flex", alignItems:"center", gap:"0.5rem", borderRadius:"0.375rem", backgroundColor:"#111827", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem", color:"#fff", opacity:0.5}}
          disabled>
          <TbUpload style={{height:"1rem", width:"1rem"}} />
          Upload
        </button>
      </div>
    </div>
  ),
};
