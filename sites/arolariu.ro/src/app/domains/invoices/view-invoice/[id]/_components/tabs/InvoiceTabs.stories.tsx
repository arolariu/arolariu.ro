import type {Meta, StoryObj} from "@storybook/react";
import {TbChefHat, TbClock, TbExternalLink, TbInfoCircle} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceTabs component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` for recipes and metadata.
 * This story renders a faithful HTML replica showing the "Possible Recipes" and
 * "Additional Info" tabs.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceTabs",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with recipe cards visible. */
export const WithRecipes: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb"}}>
      <div style={{padding: "1.5rem", paddingBottom: "0"}}>
        <div
          style={{
            display: "grid",
            width: "100%",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            borderRadius: "0.5rem",
            backgroundColor: "#f3f4f6",
            padding: "0.25rem",
          }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              backgroundColor: "#fff",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}>
            <TbChefHat style={{height: "1rem", width: "1rem"}} />
            Possible Recipes
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}>
            <TbInfoCircle style={{height: "1rem", width: "1rem"}} />
            Additional Info
          </button>
        </div>
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem"}}>
        {[
          {name: "Pasta Carbonara", complexity: "Normal", duration: 35, prep: 15, cook: 20},
          {name: "Caesar Salad", complexity: "Easy", duration: 15, prep: 15, cook: 0},
        ].map((recipe) => (
          <div
            key={recipe.name}
            style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1rem"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
              <h4 style={{fontWeight: 600}}>{recipe.name}</h4>
              <span
                style={{
                  borderRadius: "9999px",
                  paddingLeft: "0.5rem",
                  paddingRight: "0.5rem",
                  paddingTop: "0.125rem",
                  paddingBottom: "0.125rem",
                  fontSize: "0.75rem",
                  ...(recipe.complexity === "Easy"
                    ? {backgroundColor: "#f3f4f6", color: "#374151"}
                    : {backgroundColor: "#dbeafe", color: "#1d4ed8"}),
                }}>
                {recipe.complexity}
              </span>
            </div>
            <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
              A classic recipe using ingredients from your purchase.
            </p>
            <div style={{marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#6b7280"}}>
              <TbClock style={{height: "1rem", width: "1rem"}} />
              <span>{recipe.duration} min</span>
              <span style={{color: "#d1d5db"}}>•</span>
              <span>
                Prep: {recipe.prep}m, Cook: {recipe.cook}m
              </span>
            </div>
            <button
              style={{marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", color: "#2563eb"}}>
              View Recipe
              <TbExternalLink style={{height: "0.75rem", width: "0.75rem"}} />
            </button>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty recipes state. */
export const EmptyRecipes: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb"}}>
      <div style={{padding: "1.5rem", paddingBottom: "0"}}>
        <div
          style={{
            display: "grid",
            width: "100%",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            borderRadius: "0.5rem",
            backgroundColor: "#f3f4f6",
            padding: "0.25rem",
          }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              backgroundColor: "#fff",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}>
            <TbChefHat style={{height: "1rem", width: "1rem"}} />
            Possible Recipes
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}>
            <TbInfoCircle style={{height: "1rem", width: "1rem"}} />
            Additional Info
          </button>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem"}}>
        <TbChefHat style={{color: "rgba(107,114,128,0.5)", height: "3rem", width: "3rem"}} />
        <p style={{marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280"}}>No recipes available for this invoice.</p>
      </div>
    </div>
  ),
};
