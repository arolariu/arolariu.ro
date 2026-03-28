import type {Meta, StoryObj} from "@storybook/react";
import {TbCalendar, TbFileInvoice, TbRobot, TbShare, TbStar, TbUsers} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceTimeline component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` and `useDialog`.
 * This story renders a faithful HTML replica of the visual structure with mock timeline
 * data and sharing information.
 */
const meta = {
  title: "Invoices/ViewInvoice/Timeline/InvoiceTimeline",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default timeline with grouped events and shared users section. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius:'0.75rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{padding:'1.5rem', paddingBottom:'1rem'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.125rem', fontWeight:600}}>
            <TbCalendar style={{color:'#6b7280', height:'1rem', width:'1rem'}} />
            Invoice Timeline
          </h3>
          <span style={{borderRadius:'9999px', backgroundColor:'#f3f4f6', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>5 events</span>
        </div>
        <p style={{color:'#6b7280', marginTop:'0.25rem', fontSize:'0.875rem'}}>Track all changes and actions performed on this invoice.</p>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:'1.5rem', padding:'1.5rem', paddingTop:'0'}}>
        {/* Date Group 1 */}
        <div>
          <p style={{marginBottom:'0.5rem', fontSize:'0.75rem', fontWeight:500, color:'#6b7280'}}>January 15, 2025</p>
          <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
              <div style={{marginTop:'0.125rem', borderRadius:'9999px', backgroundColor:'#dbeafe', padding:'0.375rem'}}>
                <TbFileInvoice style={{height:'0.875rem', width:'0.875rem', color:'#2563eb'}} />
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>Invoice Created</p>
                <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Receipt scanned and invoice record created</p>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
              <div style={{marginTop:'0.125rem', borderRadius:'9999px', backgroundColor:'#f3e8ff', padding:'0.375rem'}}>
                <TbRobot style={{height:'0.875rem', width:'0.875rem', color:'#9333ea'}} />
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>AI Analysis Complete</p>
                <p style={{fontSize:'0.75rem', color:'#6b7280'}}>12 items detected, 94% confidence</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Group 2 */}
        <div>
          <p style={{marginBottom:'0.5rem', fontSize:'0.75rem', fontWeight:500, color:'#6b7280'}}>January 16, 2025</p>
          <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
              <div style={{marginTop:'0.125rem', borderRadius:'9999px', backgroundColor:'#dcfce7', padding:'0.375rem'}}>
                <TbShare style={{height:'0.875rem', width:'0.875rem', color:'#16a34a'}} />
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>Invoice Shared</p>
                <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Shared with 2 users</p>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
              <div style={{marginTop:'0.125rem', borderRadius:'9999px', backgroundColor:'#fef9c3', padding:'0.375rem'}}>
                <TbStar style={{height:'0.875rem', width:'0.875rem', color:'#ca8a04'}} />
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>Marked Important</p>
                <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Invoice flagged for quick access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shared With Section */}
        <div style={{borderTop:'1px solid #e5e7eb', paddingTop:'1rem'}}>
          <div style={{marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <TbUsers style={{color:'#6b7280', height:'1rem', width:'1rem'}} />
            <p style={{fontSize:'0.75rem', fontWeight:500, color:'#6b7280'}}>Shared with</p>
            <span style={{borderRadius:'9999px', backgroundColor:'#f3f4f6', paddingLeft:'0.375rem', paddingRight:'0.375rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>2</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <div style={{display:'flex', height:'1.75rem', width:'1.75rem', alignItems:'center', justifyContent:'center', borderRadius:'9999px', backgroundColor:'#dbeafe', fontSize:'0.75rem', fontWeight:500, color:'#2563eb'}}>AB</div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>alice@example.com</p>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <div style={{display:'flex', height:'1.75rem', width:'1.75rem', alignItems:'center', justifyContent:'center', borderRadius:'9999px', backgroundColor:'#dcfce7', fontSize:'0.75rem', fontWeight:500, color:'#16a34a'}}>
                BC
              </div>
              <div>
                <p style={{fontSize:'0.875rem', fontWeight:500}}>bob@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
