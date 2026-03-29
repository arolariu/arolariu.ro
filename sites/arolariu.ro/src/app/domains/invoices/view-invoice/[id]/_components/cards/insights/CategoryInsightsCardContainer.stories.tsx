import type {Meta, StoryObj} from "@storybook/react";
import {TbChefHat, TbLeaf, TbShoppingCart, TbToolsKitchen2, TbTruck} from "react-icons/tb";

/**
 * Static visual preview of the CategoryInsightsCardContainer component.
 *
 * The actual component depends on `useInvoiceContext` and switches between
 * NutritionCard, DiningCard, HomeInventoryCard, VehicleCard,
 * CategorySuggestionCard, and GeneralExpenseCard based on the invoice category.
 *
 * This story shows a representative card for each category.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/CategoryInsightsContainer",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grocery category — nutrition-focused insights. */
export const GroceryCategory: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
      <div style={{marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#dcfce7", padding: "0.5rem"}}>
          <TbLeaf style={{height: "1.25rem", width: "1.25rem", color: "#16a34a"}} />
        </div>
        <div>
          <h3 style={{fontWeight: 600}}>Nutrition Insights</h3>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Based on your grocery purchase</p>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#f0fdf4", padding: "0.75rem"}}>
          <p style={{fontSize: "0.875rem", fontWeight: 500}}>Estimated Calories</p>
          <p style={{fontSize: "1.5rem", fontWeight: 700, color: "#16a34a"}}>~2,450 kcal</p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "0.5rem",
            textAlign: "center",
            fontSize: "0.75rem",
          }}>
          <div style={{borderRadius: "0.375rem", backgroundColor: "#f9fafb", padding: "0.5rem"}}>
            <p style={{fontWeight: 500}}>Protein</p>
            <p style={{fontSize: "0.875rem", fontWeight: 700}}>85g</p>
          </div>
          <div style={{borderRadius: "0.375rem", backgroundColor: "#f9fafb", padding: "0.5rem"}}>
            <p style={{fontWeight: 500}}>Carbs</p>
            <p style={{fontSize: "0.875rem", fontWeight: 700}}>320g</p>
          </div>
          <div style={{borderRadius: "0.375rem", backgroundColor: "#f9fafb", padding: "0.5rem"}}>
            <p style={{fontWeight: 500}}>Fat</p>
            <p style={{fontSize: "0.875rem", fontWeight: 700}}>65g</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Dining category — restaurant insights. */
export const DiningCategory: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
      <div style={{marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#ffedd5", padding: "0.5rem"}}>
          <TbToolsKitchen2 style={{height: "1.25rem", width: "1.25rem", color: "#ea580c"}} />
        </div>
        <div>
          <h3 style={{fontWeight: 600}}>Dining Insights</h3>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Restaurant spending analysis</p>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem"}}>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Tip amount</span>
          <span style={{fontWeight: 500}}>$8.50 (18%)</span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Avg. per person</span>
          <span style={{fontWeight: 500}}>$24.50</span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Cuisine type</span>
          <span style={{fontWeight: 500}}>Italian</span>
        </div>
      </div>
    </div>
  ),
};

/** Vehicle category — auto expense insights. */
export const VehicleCategory: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
      <div style={{marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#dbeafe", padding: "0.5rem"}}>
          <TbTruck style={{height: "1.25rem", width: "1.25rem", color: "#2563eb"}} />
        </div>
        <div>
          <h3 style={{fontWeight: 600}}>Vehicle Insights</h3>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Auto expense analysis</p>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem"}}>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Fuel cost/gallon</span>
          <span style={{fontWeight: 500}}>$3.45</span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Total gallons</span>
          <span style={{fontWeight: 500}}>14.2 gal</span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Monthly avg.</span>
          <span style={{fontWeight: 500}}>$180.00</span>
        </div>
      </div>
    </div>
  ),
};

/** Undefined category — suggestion card. */
export const CategorySuggestion: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
      <div style={{marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#fef9c3", padding: "0.5rem"}}>
          <TbShoppingCart style={{height: "1.25rem", width: "1.25rem", color: "#ca8a04"}} />
        </div>
        <div>
          <h3 style={{fontWeight: 600}}>Category Not Set</h3>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>We detected this might be a grocery purchase</p>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
        <p style={{fontSize: "0.875rem", color: "#4b5563"}}>Set a category to unlock detailed insights for this invoice.</p>
        <div style={{display: "flex", gap: "0.5rem"}}>
          {["Grocery", "Dining", "Home"].map((cat) => (
            <button
              key={cat}
              style={{
                borderRadius: "9999px",
                border: "1px solid #e5e7eb",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                paddingTop: "0.25rem",
                paddingBottom: "0.25rem",
                fontSize: "0.75rem",
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};

/** General expense fallback. */
export const GeneralExpense: Story = {
  render: () => (
    <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
      <div style={{marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div style={{borderRadius: "0.5rem", backgroundColor: "#f3f4f6", padding: "0.5rem"}}>
          <TbChefHat style={{height: "1.25rem", width: "1.25rem", color: "#4b5563"}} />
        </div>
        <div>
          <h3 style={{fontWeight: 600}}>General Expense</h3>
          <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Basic spending analysis</p>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem"}}>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Total spent</span>
          <span style={{fontWeight: 500}}>$67.30</span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: "#6b7280"}}>Items count</span>
          <span style={{fontWeight: 500}}>8 items</span>
        </div>
      </div>
    </div>
  ),
};
