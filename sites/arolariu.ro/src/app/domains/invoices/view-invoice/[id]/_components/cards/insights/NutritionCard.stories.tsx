import type {Meta, StoryObj} from "@storybook/react";

/**
 * NutritionCard displays nutritional insights from grocery invoice items,
 * showing food group breakdowns, balance scores, and dietary suggestions.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the nutrition card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the nutrition insights card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', padding: '1rem'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600}}>🥗 Nutrition Insights</h3>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem'}}>
          {[
            {name: "Dairy", icon: "🥛", items: 3, pct: 25},
            {name: "Fruits", icon: "🍎", items: 4, pct: 30},
            {name: "Meat", icon: "🥩", items: 2, pct: 20},
            {name: "Grains", icon: "🌾", items: 3, pct: 25},
          ].map((group) => (
            <div
              key={group.name}
              style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.75rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>{group.icon}</span>
                <span style={{fontSize: '0.875rem', fontWeight: 500}}>{group.name}</span>
              </div>
              <p style={{fontSize: '0.75rem', color: '#6b7280'}}>{group.items} items</p>
              <div style={{marginTop: '0.25rem', height: '0.375rem', width: '100%', overflow: 'hidden', borderRadius: '0.25rem', backgroundColor: '#e5e7eb'}}>
                <div
                  style={{height: '100%', borderRadius: '0.25rem', backgroundColor: '#22c55e', width: `${String(group.pct)}%`}}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{borderRadius: '0.375rem', backgroundColor: '#f0fdf4', padding: '0.75rem', textAlign: 'center'}}>
          <p style={{fontSize: '0.875rem', fontWeight: 500, color: '#15803d'}}>Balance Score: Good</p>
          <p style={{fontSize: '0.75rem', color: '#6b7280'}}>Your grocery selection is well-balanced</p>
        </div>
      </div>
    </div>
  ),
};
