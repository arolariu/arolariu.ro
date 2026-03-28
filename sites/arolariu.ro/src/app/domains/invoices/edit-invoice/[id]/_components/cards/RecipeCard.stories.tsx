import type {Meta, StoryObj} from "@storybook/react";

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions. It depends on `useDialog` for edit/delete/share.
 *
 * This story renders a static preview of the recipe card layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/RecipeCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of an easy recipe card. */
export const EasyRecipe: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
          <div>
            <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Salmon Pasta</h3>
            <span
              style={{
                marginTop: "0.25rem",
                display: "inline-block",
                borderRadius: "9999px",
                backgroundColor: "#dbeafe",
                padding: "0.125rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#1e40af",
              }}>
              Easy
            </span>
          </div>
          <button
            type='button'
            style={{borderRadius: "0.375rem", padding: "0.25rem"}}>
            ⋯
          </button>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <p style={{fontSize: "0.875rem", color: "#4b5563"}}>A quick and delicious pasta dish with fresh salmon and herbs.</p>
        <div>
          <h4 style={{fontSize: "0.75rem", fontWeight: 600, color: "#6b7280"}}>Ingredients</h4>
          <ul style={{marginTop: "0.25rem", listStyleType: "disc", paddingLeft: "1.25rem", fontSize: "0.875rem", color: "#4b5563"}}>
            <li>Pasta (200g)</li>
            <li>Fresh Salmon (150g)</li>
            <li>Olive Oil</li>
            <li style={{color: "#2563eb"}}>+2 more...</li>
          </ul>
        </div>
        <div style={{display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>⏱ Prep: 10 min</span>
          <span>🍳 Cook: 20 min</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          padding: "0.5rem 1rem",
        }}>
        <button
          type='button'
          style={{fontSize: "0.875rem", color: "#4b5563"}}>
          Visit Reference 🔗
        </button>
        <button
          type='button'
          style={{borderRadius: "0.375rem", backgroundColor: "#2563eb", padding: "0.375rem 0.75rem", fontSize: "0.875rem", color: "white"}}>
          View Recipe
        </button>
      </div>
    </div>
  ),
};

/** Preview of a hard recipe card. */
export const HardRecipe: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <div>
          <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Beef Wellington</h3>
          <span
            style={{
              marginTop: "0.25rem",
              display: "inline-block",
              borderRadius: "9999px",
              backgroundColor: "#fee2e2",
              padding: "0.125rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#991b1b",
            }}>
            Hard
          </span>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem"}}>
        <p style={{fontSize: "0.875rem", color: "#4b5563"}}>
          A classic British dish featuring beef fillet wrapped in pâté and puff pastry.
        </p>
        <div style={{display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>⏱ Prep: 45 min</span>
          <span>🍳 Cook: 90 min</span>
        </div>
      </div>
    </div>
  ),
};
