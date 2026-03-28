import type {Meta, StoryObj} from "@storybook/react";
import {TbChartBar, TbTrendingUp} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceAnalytics component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` and `useUserInformation`.
 * This story renders a faithful HTML replica of the analytics dashboard with summary stats
 * and chart placeholders.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceAnalytics",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics dashboard with current invoice tab. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius:'0.75rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}>
      {/* Tab Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e5e7eb', padding:'1.5rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <TbChartBar style={{height:'1.25rem', width:'1.25rem', color:'#9ca3af'}} />
          <h2 style={{fontSize:'1.125rem', fontWeight:600}}>Invoice Analytics</h2>
        </div>
        <div style={{display:'flex', borderRadius:'0.5rem', border:'1px solid #e5e7eb'}}>
          <button style={{display:'flex', alignItems:'center', gap:'0.375rem', borderTopLeftRadius:'0.5rem', borderBottomLeftRadius:'0.5rem', backgroundColor:'#f3f4f6', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.375rem', paddingBottom:'0.375rem', fontSize:'0.875rem', fontWeight:500}}>
            <TbChartBar style={{height:'0.875rem', width:'0.875rem'}} />
            Current
          </button>
          <button style={{display:'flex', alignItems:'center', gap:'0.375rem', borderTopRightRadius:'0.5rem', borderBottomRightRadius:'0.5rem', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.375rem', paddingBottom:'0.375rem', fontSize:'0.875rem', color:'#6b7280'}}>
            <TbTrendingUp style={{height:'0.875rem', width:'0.875rem'}} />
            Compare
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div style={{display:'grid', gap:'1rem', padding:'1.5rem', gridTemplateColumns:'repeat(2, minmax(0, 1fr))'}}>
        {/* Summary Stats */}
        <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', padding:'1rem'}}>
          <h3 style={{marginBottom:'0.75rem', fontSize:'0.875rem', fontWeight:500, color:'#6b7280'}}>Summary</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'1rem'}}>
            <div>
              <p style={{fontSize:'1.5rem', fontWeight:'bold'}}>€42.75</p>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Total Amount</p>
            </div>
            <div>
              <p style={{fontSize:'1.5rem', fontWeight:'bold'}}>12</p>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Items Purchased</p>
            </div>
            <div>
              <p style={{fontSize:'1.5rem', fontWeight:'bold'}}>€3.56</p>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Average Price</p>
            </div>
            <div>
              <p style={{fontSize:'1.5rem', fontWeight:'bold'}}>4</p>
              <p style={{fontSize:'0.75rem', color:'#6b7280'}}>Categories</p>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', padding:'1rem'}}>
          <h3 style={{marginBottom:'0.75rem', fontSize:'0.875rem', fontWeight:500, color:'#6b7280'}}>Spending by Category</h3>
          <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            {[
              {name: "Dairy", pct: 35, color: "#3b82f6"},
              {name: "Bakery", pct: 25, color: "#22c55e"},
              {name: "Produce", pct: 22, color: "#f97316"},
              {name: "Other", pct: 18, color: "#9ca3af"},
            ].map((cat) => (
              <div key={cat.name}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem'}}>
                  <span>{cat.name}</span>
                  <span style={{color:'#6b7280'}}>{cat.pct}%</span>
                </div>
                <div style={{marginTop:'0.25rem', height:'0.5rem', overflow:'hidden', borderRadius:'9999px', backgroundColor:'#f3f4f6'}}>
                  <div
                    style={{height:'100%', borderRadius:'9999px', backgroundColor: cat.color, width: `${String(cat.pct)}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Distribution */}
        <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', padding:'1rem'}}>
          <h3 style={{marginBottom:'0.75rem', fontSize:'0.875rem', fontWeight:500, color:'#6b7280'}}>Price Distribution</h3>
          <div style={{display:'flex', height:'8rem', alignItems:'flex-end', justifyContent:'space-around'}}>
            {[30, 55, 80, 45, 65, 40, 25].map((h, i) => (
              <div
                key={i}
                style={{width:'1.5rem', borderTopLeftRadius:'0.25rem', borderTopRightRadius:'0.25rem', backgroundColor:'#c084fc', height: `${String(h)}%`}}
              />
            ))}
          </div>
          <div style={{marginTop:'0.5rem', display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#9ca3af'}}>
            <span>€0</span>
            <span>€5</span>
            <span>€10</span>
            <span>€15</span>
            <span>€20+</span>
          </div>
        </div>

        {/* Items Breakdown (full width) */}
        <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', padding:'1rem', gridColumn:'span 2'}}>
          <h3 style={{marginBottom:'0.75rem', fontSize:'0.875rem', fontWeight:500, color:'#6b7280'}}>Items Breakdown</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:'0.5rem'}}>
            {["Whole Milk", "Bread", "Eggs", "Bananas", "Cheese", "Butter", "Yogurt", "Apples"].map((item) => (
              <div
                key={item}
                style={{borderRadius:'0.375rem', border:'1px solid #e5e7eb', padding:'0.5rem', textAlign:'center', fontSize:'0.75rem'}}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};
