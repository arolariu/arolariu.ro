import type {Meta, StoryObj} from "@storybook/react";

/**
 * CategorySuggestionCard allows users to categorize their invoice by selecting
 * from main and extended category options. Uses a step-based UI with progress.
 * Depends on `useTranslations` and category utility data.
 *
 * This story renders a static preview of the category suggestion card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/CategorySuggestionCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1 — main category selection. */
export const MainCategoryStep: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
            🎁 Categorize Invoice
          </h3>
          <span style={{fontSize: "0.75rem", color: "#6b7280"}}>Step 1 of 2</span>
        </div>
        <div
          style={{
            marginTop: "0.5rem",
            height: "0.375rem",
            width: "100%",
            overflow: "hidden",
            borderRadius: "0.25rem",
            backgroundColor: "#e5e7eb",
          }}>
          <div style={{height: "100%", borderRadius: "0.25rem", backgroundColor: "#2563eb", width: "50%"}} />
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>What type of purchase is this?</p>
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem"}}>
          {[
            {icon: "🛒", label: "Groceries"},
            {icon: "🍽", label: "Dining"},
            {icon: "🏠", label: "Home"},
            {icon: "🚗", label: "Vehicle"},
            {icon: "🏥", label: "Healthcare"},
            {icon: "🎭", label: "Entertainment"},
          ].map((cat) => (
            <button
              key={cat.label}
              type='button'
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                padding: "0.75rem",
                fontSize: "0.875rem",
              }}>
              <span style={{fontSize: "1.25rem"}}>{cat.icon}</span>
              <span style={{fontSize: "0.75rem"}}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};

/** Step 1 with a selection made. */
export const WithSelection: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <h3 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
            🎁 Categorize Invoice
          </h3>
          <span style={{fontSize: "0.75rem", color: "#6b7280"}}>Step 1 of 2</span>
        </div>
        <div
          style={{
            marginTop: "0.5rem",
            height: "0.375rem",
            width: "100%",
            overflow: "hidden",
            borderRadius: "0.25rem",
            backgroundColor: "#e5e7eb",
          }}>
          <div style={{height: "100%", borderRadius: "0.25rem", backgroundColor: "#2563eb", width: "50%"}} />
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>What type of purchase is this?</p>
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem"}}>
          {[
            {icon: "🛒", label: "Groceries", selected: true},
            {icon: "🍽", label: "Dining", selected: false},
            {icon: "🏠", label: "Home", selected: false},
          ].map((cat) => (
            <button
              key={cat.label}
              type='button'
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                padding: "0.75rem",
                fontSize: "0.875rem",
                ...(cat.selected ? {borderColor: "#3b82f6", backgroundColor: "#eff6ff"} : {}),
              }}>
              <span style={{fontSize: "1.25rem"}}>{cat.icon}</span>
              <span style={{fontSize: "0.75rem"}}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};
