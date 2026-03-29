import type {Meta, StoryObj} from "@storybook/react";

/**
 * RecipesTab displays recipe cards generated from invoice items, with
 * pagination and a generate-more action. Depends on `useDialog`.
 *
 * This story renders a static preview of the recipes tab layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Tabs/RecipesTab",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview with recipe cards. */
export const WithRecipes: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#ffffff"}}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <div>
          <h3 style={{fontSize: "1.125rem", fontWeight: "600"}}>AI-Generated Recipes</h3>
          <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Recipes created from your invoice items</p>
        </div>
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
            }}>
            🎉 Generate More
          </button>
          <button
            type='button'
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
            }}>
            ➕ Add Recipe
          </button>
        </div>
      </div>
      <div style={{display: "grid", gap: "1rem", padding: "1rem", gridTemplateColumns: "repeat(2, 1fr)"}}>
        {[
          {name: "Creamy Pasta", complexity: "Easy", time: "30 min"},
          {name: "Grilled Chicken Salad", complexity: "Easy", time: "25 min"},
          {name: "Beef Stir-Fry", complexity: "Medium", time: "40 min"},
        ].map((recipe) => (
          <div
            key={recipe.name}
            style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1rem"}}>
            <h4 style={{fontWeight: "500"}}>{recipe.name}</h4>
            <div style={{marginTop: "0.25rem", display: "flex", gap: "0.5rem"}}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "#dbeafe",
                  paddingLeft: "0.5rem",
                  paddingRight: "0.5rem",
                  paddingTop: "0.125rem",
                  paddingBottom: "0.125rem",
                  fontSize: "0.75rem",
                  color: "#1e40af",
                }}>
                {recipe.complexity}
              </span>
              <span style={{fontSize: "0.75rem", color: "#6b7280"}}>⏱ {recipe.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty recipes tab. */
export const NoRecipes: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#ffffff"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600"}}>AI-Generated Recipes</h3>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>No recipes generated yet</p>
      </div>
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "2rem", textAlign: "center"}}>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>No recipes have been generated for this invoice yet.</p>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          🎉 Generate Recipes
        </button>
      </div>
    </div>
  ),
};
