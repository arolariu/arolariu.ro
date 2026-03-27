import type {Meta, StoryObj} from "@storybook/react";

/**
 * ReceiptScanCard shows receipt images with navigation, zoom dialog, and
 * previous/next controls. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the receipt scan card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/ReceiptScan",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single scan card. */
export const SingleScan: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Receipt Scan</h3>
      </div>
      <div style={{display:'flex', justifyContent:'center', padding:'1rem'}}>
        <div style={{height:'250px', width:'170px', cursor:'pointer', overflow:'hidden', borderRadius:'0.375rem', border:'1px solid #e5e7eb', backgroundColor:'#f3f4f6'}}>
          <img
            src='https://picsum.photos/seed/receiptscan/340/500'
            alt='Receipt scan'
            style={{height:'100%', width:'100%', objectFit:'cover'}}
          />
        </div>
      </div>
      <div style={{borderTop:'1px solid #e5e7eb', padding:'1rem'}}>
        <button
          type='button'
          style={{width:'100%', borderRadius:'0.375rem', border:'1px solid #e5e7eb', paddingLeft:'1rem', paddingRight:'1rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem'}}>
          🔍 Expand
        </button>
      </div>
    </div>
  ),
};

/** Multiple scans with navigation. */
export const MultipleScans: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Receipt Scan (1/3)</h3>
      </div>
      <div style={{display:'flex', justifyContent:'center', padding:'1rem'}}>
        <div style={{height:'250px', width:'170px', cursor:'pointer', overflow:'hidden', borderRadius:'0.375rem', border:'1px solid #e5e7eb', backgroundColor:'#f3f4f6'}}>
          <img
            src='https://picsum.photos/seed/receiptscan2/340/500'
            alt='Receipt scan 1 of 3'
            style={{height:'100%', width:'100%', objectFit:'cover'}}
          />
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', borderTop:'1px solid #e5e7eb', padding:'1rem'}}>
        <button
          type='button'
          style={{width:'100%', borderRadius:'0.375rem', border:'1px solid #e5e7eb', paddingLeft:'1rem', paddingRight:'1rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem'}}>
          🔍 Expand
        </button>
        <div style={{display:'flex', gap:'0.5rem'}}>
          <button
            type='button'
            disabled
            style={{flex:'1', borderRadius:'0.375rem', border:'1px solid #e5e7eb', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem', opacity:0.5}}>
            Previous
          </button>
          <button
            type='button'
            style={{flex:'1', borderRadius:'0.375rem', border:'1px solid #e5e7eb', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem'}}>
            Next
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Receipt scan with a placeholder image from picsum.photos. */
export const WithImage: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{fontSize:'1.125rem', fontWeight:600}}>Receipt Scan</h3>
      </div>
      <div style={{display:'flex', justifyContent:'center', padding:'1rem'}}>
        <div style={{height:'300px', width:'200px', cursor:'pointer', overflow:'hidden', borderRadius:'0.375rem', border:'1px solid #e5e7eb'}}>
          <img
            src='https://picsum.photos/400/600'
            alt='Receipt scan preview'
            style={{height:'100%', width:'100%', objectFit:'cover'}}
          />
        </div>
      </div>
      <div style={{borderTop:'1px solid #e5e7eb', padding:'1rem'}}>
        <button
          type='button'
          style={{width:'100%', borderRadius:'0.375rem', border:'1px solid #e5e7eb', paddingLeft:'1rem', paddingRight:'1rem', paddingTop:'0.5rem', paddingBottom:'0.5rem', fontSize:'0.875rem'}}>
          🔍 Expand
        </button>
      </div>
    </div>
  ),
};
