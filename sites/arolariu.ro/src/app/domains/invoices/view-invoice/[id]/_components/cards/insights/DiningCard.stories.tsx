import type {Meta, StoryObj} from "@storybook/react";

/**
 * DiningCard displays dining-related insights from restaurant/fast-food invoices,
 * including estimated calories, cost per person, and dining tips.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the dining card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/DiningCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the dining insights card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.125rem', fontWeight:600}}>🍽 Dining Insights</h3>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1rem'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'0.75rem'}}>
          <div style={{borderRadius:'0.375rem', border:'1px solid #e5e7eb', padding:'0.75rem', textAlign:'center'}}>
            <span style={{fontSize:'1.5rem'}}>🔥</span>
            <p style={{fontSize:'1.125rem', fontWeight:700}}>1,820</p>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Est. Calories</p>
          </div>
          <div style={{borderRadius:'0.375rem', border:'1px solid #e5e7eb', padding:'0.75rem', textAlign:'center'}}>
            <span style={{fontSize:'1.5rem'}}>👥</span>
            <p style={{fontSize:'1.125rem', fontWeight:700}}>$18.50</p>
            <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Cost / Person</p>
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
          <div style={{display:'flex', alignItems:'flex-start', gap:'0.5rem', borderRadius:'0.375rem', backgroundColor:'#fffbeb', padding:'0.75rem'}}>
            <span style={{marginTop:'0.125rem'}}>⚠️</span>
            <div>
              <p style={{fontSize:'0.875rem', fontWeight:500}}>High Calorie Meal</p>
              <p style={{fontSize:'0.75rem', color:'#4b5563'}}>This meal exceeds typical recommended intake.</p>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'flex-start', gap:'0.5rem', borderRadius:'0.375rem', backgroundColor:'#eff6ff', padding:'0.75rem'}}>
            <span style={{marginTop:'0.125rem'}}>💡</span>
            <div>
              <p style={{fontSize:'0.875rem', fontWeight:500}}>Budget Tip</p>
              <p style={{fontSize:'0.75rem', color:'#4b5563'}}>Cooking at home could save up to 60% per meal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
