import type {Meta, StoryObj} from "@storybook/react";

/**
 * SeasonalInsightsCard detects and displays seasonal spending patterns
 * and provides actionable insights. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the seasonal insights card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/SeasonalInsights",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** December holiday season insights. */
export const HolidaySeason: Story = {
  render: () => (
    <div style={{borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', padding: '1rem'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600}}>✨ Seasonal Insights</h3>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem'}}>
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem'}}>
            <span style={{color: '#6b7280'}}>Spending so far in December</span>
            <span style={{fontWeight: 500}}>$1,245.00</span>
          </div>
          <div style={{marginTop: '0.5rem', height: '0.5rem', width: '100%', overflow: 'hidden', borderRadius: '9999px', backgroundColor: '#e5e7eb'}}>
            <div
              style={{height: '100%', borderRadius: '9999px', backgroundColor: '#2563eb', width: '69%'}}
            />
          </div>
          <div style={{marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280'}}>
            <span>vs. December average: $1,800.00</span>
            <span>69%</span>
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderRadius: '0.375rem', backgroundColor: '#eff6ff', padding: '0.75rem'}}>
            <span style={{marginTop: '0.125rem', color: '#2563eb'}}>✨</span>
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: 500}}>Holiday Season</p>
              <p style={{fontSize: '0.75rem', color: '#4b5563'}}>Spending tends to increase during the holiday season.</p>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderRadius: '0.375rem', backgroundColor: '#f0fdf4', padding: '0.75rem'}}>
            <span style={{marginTop: '0.125rem', color: '#16a34a'}}>💡</span>
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: 500}}>Stock Up Tip</p>
              <p style={{fontSize: '0.75rem', color: '#4b5563'}}>Consider buying non-perishables early for better deals.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Normal spending pattern. */
export const NormalPattern: Story = {
  render: () => (
    <div style={{borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', padding: '1rem'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600}}>✨ Seasonal Insights</h3>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem'}}>
        <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderRadius: '0.375rem', backgroundColor: '#f0fdf4', padding: '0.75rem'}}>
          <span style={{marginTop: '0.125rem', color: '#16a34a'}}>🛍</span>
          <div>
            <p style={{fontSize: '0.875rem', fontWeight: 500}}>Normal Spending</p>
            <p style={{fontSize: '0.75rem', color: '#4b5563'}}>Your spending patterns look consistent with your historical average.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
