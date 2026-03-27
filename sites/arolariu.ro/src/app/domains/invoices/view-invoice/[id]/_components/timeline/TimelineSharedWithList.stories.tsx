import type {Meta, StoryObj} from "@storybook/react";
import {TbExternalLink, TbGlobe, TbMail, TbUsers} from "react-icons/tb";

/**
 * Static visual preview of the TimelineSharedWithList component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext`, `useDialog`, and
 * `useUserInformation`. This story renders a faithful HTML replica showing shared users
 * with avatars, email actions, and a public access warning.
 */
const meta = {
  title: "Invoices/ViewInvoice/Timeline/SharedWithList",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with two shared users. */
export const Default: Story = {
  render: () => (
    <div style={{display:'flex', flexDirection:'column', gap:'0.75rem', borderTop:'1px solid #e5e7eb', paddingTop:'1rem'}}>
      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
        <TbUsers style={{color:'#6b7280', height:'1rem', width:'1rem'}} />
        <p style={{fontSize:'0.75rem', fontWeight:500, color:'#6b7280'}}>Shared with</p>
        <span style={{borderRadius:'9999px', backgroundColor:'#f3f4f6', paddingLeft:'0.375rem', paddingRight:'0.375rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>2</span>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
        {["alice@example.com", "bob@example.com"].map((user) => (
          <div
            key={user}
            style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderRadius:'0.375rem', padding:'0.375rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <div style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#3b82f6', display:'flex', height:'1.75rem', width:'1.75rem', alignItems:'center', justifyContent:'center', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:500}}>
                {user.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>{user.split("@")[0]}</p>
                <p style={{fontSize:'0.75rem', color:'#9ca3af'}}>{user}</p>
              </div>
            </div>
            <button style={{borderRadius:'0.375rem', padding:'0.375rem'}}>
              <TbMail style={{height:'0.875rem', width:'0.875rem'}} />
            </button>
          </div>
        ))}
      </div>
      <button style={{display:'flex', width:'100%', alignItems:'center', justifyContent:'center', gap:'0.5rem', borderRadius:'0.375rem', border:'1px solid #e5e7eb', backgroundColor:'transparent', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.375rem', paddingBottom:'0.375rem', fontSize:'0.875rem'}}>
        <TbExternalLink style={{height:'0.875rem', width:'0.875rem'}} />
        Manage Sharing
      </button>
    </div>
  ),
};

/** Public access state with warning alert. */
export const PublicAccess: Story = {
  render: () => (
    <div style={{display:'flex', flexDirection:'column', gap:'0.75rem', borderTop:'1px solid #e5e7eb', paddingTop:'1rem'}}>
      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
        <TbUsers style={{color:'#6b7280', height:'1rem', width:'1rem'}} />
        <p style={{fontSize:'0.75rem', fontWeight:500, color:'#6b7280'}}>Shared with</p>
        <span style={{borderRadius:'9999px', backgroundColor:'#f3f4f6', paddingLeft:'0.375rem', paddingRight:'0.375rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>Public</span>
      </div>
      <div style={{borderRadius:'0.375rem', border:'1px solid rgba(249,115,22,0.5)', backgroundColor:'rgba(249,115,22,0.1)', padding:'0.75rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <TbGlobe style={{height:'1rem', width:'1rem', color:'#f97316'}} />
          <p style={{fontSize:'0.875rem', fontWeight:600, color:'#ea580c'}}>Public Access Enabled</p>
        </div>
        <p style={{color:'#6b7280', marginTop:'0.25rem', fontSize:'0.75rem'}}>Anyone with the link can view this invoice.</p>
      </div>
      <button style={{display:'flex', width:'100%', alignItems:'center', justifyContent:'center', gap:'0.5rem', borderRadius:'0.375rem', border:'1px solid #e5e7eb', backgroundColor:'transparent', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.375rem', paddingBottom:'0.375rem', fontSize:'0.875rem'}}>
        <TbExternalLink style={{height:'0.875rem', width:'0.875rem'}} />
        Manage Sharing
      </button>
    </div>
  ),
};
