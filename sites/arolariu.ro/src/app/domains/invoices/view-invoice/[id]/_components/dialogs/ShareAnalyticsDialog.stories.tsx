import type {Meta, StoryObj} from "@storybook/react";

/**
 * ShareAnalyticsDialog renders a tabbed sharing dialog with image and email options.
 *
 * @remarks Static preview — component destructures `{invoice}` from `useDialog()` payload
 * which is null when the dialog is closed, causing a runtime crash. The dialog can only
 * render when opened programmatically via the DialogContext.
 */
const meta = {
  title: "Invoices/ViewInvoice/Dialogs/ShareAnalyticsDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the share analytics dialog layout. */
export const Default: Story = {
  render: () => (
    <div style={{width:'100%', maxWidth:'28rem', borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', padding:'1.5rem', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}}>
      <h2 style={{marginBottom:'1rem', fontSize:'1.125rem', fontWeight:600}}>Share Analytics</h2>
      <div style={{marginBottom:'1rem', display:'flex', gap:'0.5rem'}}>
        <button style={{backgroundColor:'#3b82f6', borderRadius:'0.375rem', paddingLeft:'1rem', paddingRight:'1rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem', color:'#fff'}}>Image</button>
        <button style={{borderRadius:'0.375rem', backgroundColor:'#f3f4f6', paddingLeft:'1rem', paddingRight:'1rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem'}}>Email</button>
      </div>
      <div style={{borderRadius:'0.25rem', border:'1px solid #e5e7eb', padding:'1rem', textAlign:'center', fontSize:'0.875rem', color:'#6b7280'}}>Analytics snapshot will be generated here</div>
    </div>
  ),
};
