import type {Meta, StoryObj} from "@storybook/react";

/**
 * NutritionCard shows EU-14 structured allergen assessments for each invoice product.
 * The food-grouping subsection (food groups, basket composition, balance score)
 * has been removed (Decision D5).
 *
 * Depends on `useInvoiceContext`.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the allergen insights card layout. */
export const Preview: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
        width: "360px",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>⚠️ Allergen Insights</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        {[
          {name: "Milk 2% 1L", status: "detected", note: "Milk (explicit, 95%)"},
          {name: "Whole Wheat Bread", status: "detected", note: "Cereals Containing Gluten (explicit, 99%)"},
          {name: "Mineral Water", status: "noSignals", note: "No signals found"},
          {name: "Unknown Sauce", status: "insufficientData", note: "Insufficient data"},
          {name: "Coffee Beans", status: null, note: "Not assessed"},
        ].map((item) => (
          <div
            key={item.name}
            style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.75rem"}}>
            <p style={{fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem"}}>{item.name}</p>
            <p style={{fontSize: "0.75rem", color: item.status === "detected" ? "#dc2626" : item.status === null ? "#9ca3af" : "#6b7280"}}>
              {item.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  ),
};
