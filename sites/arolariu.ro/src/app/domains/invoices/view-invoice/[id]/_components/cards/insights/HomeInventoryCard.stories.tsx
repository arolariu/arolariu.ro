import type {Meta, StoryObj} from "@storybook/react";

/**
 * HomeInventoryCard displays home inventory insights including supply
 * stock levels, eco-friendliness scores, and bulk-buying suggestions.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the home inventory card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/HomeInventoryCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the home inventory insights card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.125rem', fontWeight:600}}>🏠 Home Inventory</h3>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1rem'}}>
        {/* Supply Stock Levels */}
        <div>
          <p style={{marginBottom:'0.5rem', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.05em', color:'#6b7280', textTransform:'uppercase'}}>Supply Stock Levels</p>
          <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            {[
              {name: "Laundry Detergent", icon: "💧", days: 45, max: 60, color: "#22c55e"},
              {name: "Dish Soap", icon: "✨", days: 18, max: 30, color: "#eab308"},
              {name: "Paper Products", icon: "🧻", days: 30, max: 45, color: "#22c55e"},
              {name: "Floor Cleaner", icon: "🧴", days: 60, max: 90, color: "#22c55e"},
            ].map((supply) => (
              <div key={supply.name}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}>
                    <span>{supply.icon}</span>
                    <span>{supply.name}</span>
                  </div>
                  <span style={{color:'#6b7280'}}>{supply.days} days remaining</span>
                </div>
                <div style={{marginTop:'0.25rem', height:'0.375rem', width:'100%', overflow:'hidden', borderRadius:'0.25rem', backgroundColor:'#e5e7eb'}}>
                  <div
                    style={{height:'100%', borderRadius:'0.25rem', backgroundColor: supply.color, width: `${String(Math.round((supply.days / supply.max) * 100))}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eco Score */}
        <div style={{borderRadius:'0.375rem', backgroundColor:'#f0fdf4', padding:'0.75rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}>
              <span>🌱</span>
              <span style={{fontSize:'0.875rem', fontWeight:500}}>Eco-Friendliness</span>
            </div>
            <div style={{display:'flex', gap:'0.125rem'}}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{fontSize:'0.875rem', color: star <= 3 ? '#22c55e' : '#d1d5db'}}>
                  ⭐
                </span>
              ))}
            </div>
          </div>
          <ul style={{marginTop:'0.5rem', display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'#4b5563'}}>
            <li>• 2 products with eco-labels</li>
            <li>• 1 recyclable packaging</li>
            <li style={{color:'#16a34a'}}>• Tip: Try concentrated versions to reduce plastic</li>
          </ul>
        </div>

        {/* Bulk Savings */}
        <div style={{display:'flex', gap:'0.5rem', borderRadius:'0.375rem', backgroundColor:'#eff6ff', padding:'0.75rem'}}>
          <span>📦</span>
          <div>
            <p style={{fontSize:'0.875rem', fontWeight:500}}>Bulk Buying Opportunity</p>
            <p style={{fontSize:'0.75rem', color:'#4b5563'}}>Save ~120 RON/year by buying in bulk</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
