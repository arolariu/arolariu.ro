import type {Meta, StoryObj} from "@storybook/react";

/**
 * GeneralExpenseCard displays general expense insights including auto-detected
 * category, budget impact analysis, tax/business options, and similar past purchases.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the general expense card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/GeneralExpenseCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the general expense insights card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius:'0.5rem', border:'1px solid #e5e7eb', backgroundColor:'#fff', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom:'1px solid #e5e7eb', padding:'1rem'}}>
        <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.125rem', fontWeight:600}}>📊 General Expense Insights</h3>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'1rem', padding:'1rem'}}>
        {/* Auto-detected Category */}
        <div>
          <p style={{marginBottom:'0.5rem', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.05em', color:'#6b7280', textTransform:'uppercase'}}>Auto-Detected Category</p>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderRadius:'0.375rem', border:'1px solid #e5e7eb', padding:'0.75rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <span>🏷️</span>
              <span style={{fontSize:'0.875rem', fontWeight:500}}>Electronics &amp; Gadgets</span>
            </div>
            <span style={{borderRadius:'9999px', backgroundColor:'#f3f4f6', paddingLeft:'0.5rem', paddingRight:'0.5rem', paddingTop:'0.125rem', paddingBottom:'0.125rem', fontSize:'0.75rem'}}>87% confidence</span>
          </div>
          <div style={{marginTop:'0.5rem', display:'flex', gap:'0.5rem'}}>
            <button
              type='button'
              style={{borderRadius:'0.25rem', border:'1px solid #e5e7eb', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.25rem', paddingBottom:'0.25rem', fontSize:'0.75rem'}}>
              ✓ Correct
            </button>
            <button
              type='button'
              style={{borderRadius:'0.25rem', paddingLeft:'0.75rem', paddingRight:'0.75rem', paddingTop:'0.25rem', paddingBottom:'0.25rem', fontSize:'0.75rem', color:'#6b7280'}}>
              ↻ Change
            </button>
          </div>
        </div>

        {/* Budget Impact */}
        <div>
          <p style={{marginBottom:'0.5rem', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.05em', color:'#6b7280', textTransform:'uppercase'}}>Budget Impact</p>
          <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            {[
              {name: "Electronics", spent: 450, limit: 500, pct: 90},
              {name: "Entertainment", spent: 120, limit: 300, pct: 40},
              {name: "Shopping", spent: 280, limit: 400, pct: 70},
            ].map((b) => (
              <div key={b.name}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem'}}>
                  <span>{b.name}</span>
                  <span style={{color: b.pct >= 90 ? '#ef4444' : '#6b7280'}}>
                    {b.spent} / {b.limit} RON
                  </span>
                </div>
                <div style={{marginTop:'0.25rem', height:'0.5rem', width:'100%', overflow:'hidden', borderRadius:'0.25rem', backgroundColor:'#e5e7eb'}}>
                  <div
                    style={{height:'100%', borderRadius:'0.25rem', backgroundColor: b.pct >= 90 ? '#ef4444' : b.pct >= 60 ? '#eab308' : '#22c55e', width: `${String(b.pct)}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{marginTop:'0.5rem', fontSize:'0.75rem', color:'#ef4444'}}>⚠ Electronics budget at 90% — nearing limit!</p>
        </div>

        {/* Tax Options */}
        <div>
          <p style={{marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.05em', color:'#6b7280', textTransform:'uppercase'}}>📄 Tax &amp; Business</p>
          <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            {["Mark as business expense", "Track warranty", "Add to insurance inventory"].map((label) => (
              <label
                key={label}
                style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem'}}>
                <input
                  type='checkbox'
                  style={{borderRadius:'0.25rem'}}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};
