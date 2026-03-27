import type {Meta, StoryObj} from "@storybook/react";
import {TbStar} from "react-icons/tb";

/**
 * Static visual preview of the FeedbackDialog component.
 *
 * The actual component depends on `useDialog` context with invoice/merchant
 * payload, so this story renders a faithful HTML replica of the feedback
 * form with star rating, feature badges, and textarea.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/FeedbackDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default feedback dialog with empty form. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius:"0.75rem", border:"1px solid #e5e7eb", backgroundColor:"#fff", boxShadow:"0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)"}}>
      <div style={{borderBottom:"1px solid #e5e7eb", padding:"1.5rem"}}>
        <h2 style={{fontSize:"1.125rem", fontWeight:600}}>Analytics Feedback</h2>
        <p style={{marginTop:"0.25rem", fontSize:"0.875rem", color:"#6b7280"}}>How was the analytics experience for Lidl?</p>
      </div>

      <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem"}}>
        {/* Star Rating */}
        <div>
          <h4 style={{marginBottom:"0.5rem", fontSize:"0.875rem", fontWeight:500}}>Rate the analytics</h4>
          <div style={{display:"flex", gap:"0.25rem"}}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                style={{padding:"0.25rem"}}>
                <TbStar style={{height:"1.5rem", width:"1.5rem", ...(star <= 3 ? {fill:"#facc15", color:"#facc15"} : {color:"#d1d5db"})}} />
              </button>
            ))}
          </div>
        </div>

        {/* Feature Selection */}
        <div>
          <h4 style={{marginBottom:"0.5rem", fontSize:"0.875rem", fontWeight:500}}>Which features were most helpful?</h4>
          <div style={{display:"flex", flexWrap:"wrap", gap:"0.5rem"}}>
            {["Spending Trends", "Price Comparisons", "Savings Tips", "Merchant Analysis", "Visual Charts", "Category Breakdown"].map(
              (feature) => (
                <span
                  key={feature}
                  style={{cursor:"pointer", borderRadius:"9999px", border:"1px solid #e5e7eb", paddingInline:"0.75rem", paddingBlock:"0.25rem", fontSize:"0.75rem", ...(feature === "Spending Trends" || feature === "Visual Charts" ? {backgroundColor:"#111827", color:"#fff"} : {})}}>
                  {feature}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Comments */}
        <div>
          <h4 style={{marginBottom:"0.5rem", fontSize:"0.875rem", fontWeight:500}}>Additional comments</h4>
          <textarea
            style={{width:"100%", borderRadius:"0.375rem", border:"1px solid #e5e7eb", backgroundColor:"transparent", padding:"0.75rem", fontSize:"0.875rem", outline:"none"}}
            rows={4}
            placeholder='Tell us what you think about the analytics features...'
            readOnly
          />
        </div>
      </div>

      <div style={{display:"flex", justifyContent:"flex-end", gap:"0.5rem", borderTop:"1px solid #e5e7eb", padding:"1rem"}}>
        <button style={{borderRadius:"0.375rem", border:"1px solid #e5e7eb", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem"}}>Cancel</button>
        <button style={{borderRadius:"0.375rem", backgroundColor:"#111827", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem", color:"#fff"}}>Submit Feedback</button>
      </div>
    </div>
  ),
};

/** With 5-star rating selected. */
export const HighRating: Story = {
  render: () => (
    <div style={{borderRadius:"0.75rem", border:"1px solid #e5e7eb", backgroundColor:"#fff", boxShadow:"0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)"}}>
      <div style={{borderBottom:"1px solid #e5e7eb", padding:"1.5rem"}}>
        <h2 style={{fontSize:"1.125rem", fontWeight:600}}>Analytics Feedback</h2>
        <p style={{marginTop:"0.25rem", fontSize:"0.875rem", color:"#6b7280"}}>How was the analytics experience for Amazon?</p>
      </div>
      <div style={{padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem"}}>
        <div>
          <h4 style={{marginBottom:"0.5rem", fontSize:"0.875rem", fontWeight:500}}>Rate the analytics</h4>
          <div style={{display:"flex", gap:"0.25rem"}}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                style={{padding:"0.25rem"}}>
                <TbStar style={{height:"1.5rem", width:"1.5rem", fill:"#facc15", color:"#facc15"}} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"flex", justifyContent:"flex-end", gap:"0.5rem", borderTop:"1px solid #e5e7eb", padding:"1rem"}}>
        <button style={{borderRadius:"0.375rem", border:"1px solid #e5e7eb", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem"}}>Cancel</button>
        <button style={{borderRadius:"0.375rem", backgroundColor:"#111827", paddingInline:"1rem", paddingBlock:"0.5rem", fontSize:"0.875rem", color:"#fff"}}>Submit Feedback</button>
      </div>
    </div>
  ),
};
