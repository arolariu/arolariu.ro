import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantDialog renders merchant details view.
 *
 * @remarks Static preview — component destructures `payload.category` from `useDialog()`
 * which is null when the dialog is closed, causing a runtime crash. The dialog can only
 * render when opened programmatically via the DialogContext.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the merchant dialog layout. */
export const Default: Story = {
  render: () => (
    <div style={{width:"100%", maxWidth:"32rem", borderRadius:"0.5rem", border:"1px solid #e5e7eb", backgroundColor:"#fff", padding:"1.5rem", boxShadow:"0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)"}}>
      <h2 style={{marginBottom:"1rem", fontSize:"1.125rem", fontWeight:600}}>Merchant Details</h2>
      <div style={{display:"flex", flexDirection:"column", gap:"0.75rem"}}>
        <div style={{display:"flex", alignItems:"center", gap:"0.75rem"}}>
          <div style={{backgroundColor:"rgba(124,58,237,0.1)", display:"flex", height:"3rem", width:"3rem", alignItems:"center", justifyContent:"center", borderRadius:"9999px", fontSize:"1.25rem"}}>🏪</div>
          <div>
            <p style={{fontWeight:500}}>Kaufland Romania</p>
            <span style={{borderRadius:"0.25rem", backgroundColor:"#dbeafe", paddingInline:"0.5rem", paddingBlock:"0.125rem", fontSize:"0.75rem", color:"#1d4ed8"}}>Grocery</span>
          </div>
        </div>
        <div style={{fontSize:"0.875rem", color:"#6b7280"}}>
          <p>📍 Str. Victoriei 12, Bucharest</p>
          <p>📱 +40 21 123 4567</p>
        </div>
      </div>
    </div>
  ),
};
