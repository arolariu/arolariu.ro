import type {Meta, StoryObj} from "@storybook/react";

/**
 * VehicleCard displays vehicle/fuel-related insights including
 * fuel details, monthly spending charts, cost per km, maintenance
 * reminders, and cheapest nearby station tips.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the vehicle card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/VehicleCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the vehicle insights card. */
export const Preview: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>🚗 Vehicle &amp; Fuel</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        {/* Expense Type */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#fffbeb",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
          }}>
          <span>⛽</span>
          <span style={{fontSize: "0.875rem", fontWeight: 500, color: "#b45309"}}>Fuel Purchase</span>
        </div>

        {/* Fuel Details Grid */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem"}}>
          {[
            {icon: "⛽", label: "Liters", value: "~45L"},
            {icon: "💰", label: "Price / Liter", value: "6.70 RON"},
            {icon: "📍", label: "Station", value: "Petrom"},
            {icon: "🚗", label: "Vehicle", value: "Not set", muted: true},
          ].map((detail) => (
            <div
              key={detail.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                padding: "0.5rem",
              }}>
              <span>{detail.icon}</span>
              <div>
                <p style={{fontSize: "0.75rem", color: "#6b7280"}}>{detail.label}</p>
                <p style={{fontSize: "0.875rem", fontWeight: 500, ...(detail.muted ? {color: "#9ca3af"} : {})}}>{detail.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem"}}>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem", textAlign: "center"}}>
            <span style={{fontSize: "0.75rem", color: "#6b7280"}}>This Month</span>
            <p style={{fontSize: "0.875rem", fontWeight: 700}}>560 RON</p>
            <span style={{fontSize: "0.75rem", color: "#9ca3af"}}>3 fill-ups</span>
          </div>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem", textAlign: "center"}}>
            <span style={{fontSize: "0.75rem", color: "#6b7280"}}>Cost / km</span>
            <p style={{fontSize: "0.875rem", fontWeight: 700}}>0.52 RON</p>
            <span style={{fontSize: "0.75rem", color: "#9ca3af"}}>Estimated</span>
          </div>
          <div style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem", textAlign: "center"}}>
            <span style={{fontSize: "0.75rem", color: "#6b7280"}}>Fuel Price</span>
            <p style={{fontSize: "0.875rem", fontWeight: 700, color: "#ef4444"}}>+8%</p>
            <span style={{fontSize: "0.75rem", color: "#9ca3af"}}>This month</span>
          </div>
        </div>

        {/* Maintenance Reminders */}
        <div>
          <p
            style={{
              marginBottom: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#6b7280",
            }}>
            🛢️ Maintenance
          </p>
          <ul style={{display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: "#4b5563"}}>
            <li>• Oil change due in 2,000 km</li>
            <li>• Tire rotation recommended</li>
          </ul>
        </div>

        {/* Tip */}
        <div style={{display: "flex", gap: "0.5rem", borderRadius: "0.375rem", backgroundColor: "#f0fdf4", padding: "0.75rem"}}>
          <span>💡</span>
          <div>
            <p style={{fontSize: "0.875rem", fontWeight: 500}}>Cheapest Nearby</p>
            <p style={{fontSize: "0.75rem", color: "#4b5563"}}>MOL Drumul Taberei - 6.55 RON/L</p>
          </div>
        </div>

        {/* CTA */}
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            style={{
              flex: 1,
              borderRadius: "0.25rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
            }}>
            Add Vehicle
          </button>
          <button
            type='button'
            style={{
              flex: 1,
              borderRadius: "0.25rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
            }}>
            Full Report
          </button>
        </div>
      </div>
    </div>
  ),
};
