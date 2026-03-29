import type {Meta, StoryObj} from "@storybook/react";

/**
 * BudgetImpactCard shows the monthly budget impact of an invoice including
 * progress bar, daily allowance, and remaining budget. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the budget impact card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/BudgetImpact",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under budget — healthy spending. */
export const UnderBudget: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          💳 Budget Impact — January
        </h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.875rem"}}>
            <span>Monthly Budget</span>
            <span style={{fontWeight: 500}}>$2,000.00</span>
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              height: "0.75rem",
              width: "100%",
              overflow: "hidden",
              borderRadius: "9999px",
              backgroundColor: "#e5e7eb",
            }}>
            <div style={{height: "100%", borderRadius: "9999px", backgroundColor: "#2563eb", width: "45%"}} />
          </div>
          <div style={{marginTop: "0.25rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
            <span>Spent: $900.00</span>
            <span>45%</span>
          </div>
        </div>
        <div style={{borderRadius: "0.375rem", backgroundColor: "#eff6ff", padding: "0.75rem", textAlign: "center"}}>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>This invoice used</p>
          <p style={{fontSize: "1.5rem", fontWeight: 700, color: "#2563eb"}}>6.3%</p>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>of monthly budget</p>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem"}}>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem", textAlign: "center"}}>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Remaining</p>
            <p style={{fontSize: "1.125rem", fontWeight: 700, color: "#16a34a"}}>$1,100.00</p>
          </div>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem", textAlign: "center"}}>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Days Left</p>
            <p style={{fontSize: "1.125rem", fontWeight: 700}}>16</p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.75rem",
          }}>
          <div>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Daily Allowance</p>
            <p style={{fontSize: "0.875rem", fontWeight: 500}}>$68.75/day</p>
          </div>
          <span>📈</span>
        </div>
      </div>
    </div>
  ),
};

/** Over budget — warning state. */
export const OverBudget: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          💳 Budget Impact — December
        </h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.875rem"}}>
            <span>Monthly Budget</span>
            <span style={{fontWeight: 500}}>$1,500.00</span>
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              height: "0.75rem",
              width: "100%",
              overflow: "hidden",
              borderRadius: "9999px",
              backgroundColor: "#e5e7eb",
            }}>
            <div style={{height: "100%", borderRadius: "9999px", backgroundColor: "#ef4444", width: "100%"}} />
          </div>
          <div style={{marginTop: "0.25rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
            <span>Spent: $1,680.00</span>
            <span>112%</span>
          </div>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem"}}>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem", textAlign: "center"}}>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Remaining</p>
            <p style={{fontSize: "1.125rem", fontWeight: 700, color: "#ef4444"}}>$180.00</p>
            <p style={{fontSize: "0.75rem", color: "#ef4444"}}>Over Budget</p>
          </div>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem", textAlign: "center"}}>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Days Left</p>
            <p style={{fontSize: "1.125rem", fontWeight: 700}}>5</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
