import type {Meta, StoryObj} from "@storybook/react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbWand, TbX} from "react-icons/tb";

/**
 * Static visual preview of the RecipeDialog component.
 *
 * @remarks Static preview — the real component uses `useDialog` context,
 * `useTranslations`, and complex recipe state management. It renders nothing
 * when the dialog is closed. This story renders a faithful HTML replica of
 * the recipe creation / editing form with sample data.
 *
 * @see {@link RecipeDialog} for the real component implementation
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RecipeDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleIngredients = ["Chicken breast (500g)", "Olive oil (2 tbsp)", "Garlic (3 cloves)", "Rosemary (fresh)", "Salt & pepper"];

/** Static preview of the create-recipe dialog form. */
export const CreateRecipe: Story = {
  render: () => (
    <div
      style={{
        width: "100%",
        maxWidth: "32rem",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Create Recipe</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Create a new recipe from your invoice ingredients.</p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        {/* Recipe name */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <label style={{fontSize: "0.875rem", fontWeight: 500}}>Recipe Name</label>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingInline: "0.5rem",
                paddingBlock: "0.25rem",
                fontSize: "0.75rem",
              }}>
              <TbSparkles style={{height: "0.75rem", width: "0.75rem"}} />
              Generate Name
            </button>
          </div>
          <input
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            defaultValue='Herb-Roasted Chicken'
            readOnly
          />
        </div>

        {/* Description */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Description</label>
          <textarea
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            rows={2}
            defaultValue='A simple and delicious herb-roasted chicken with garlic and rosemary.'
            readOnly
          />
        </div>

        {/* Ingredients */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <label style={{fontSize: "0.875rem", fontWeight: 500}}>Ingredients</label>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingInline: "0.5rem",
                paddingBlock: "0.25rem",
                fontSize: "0.75rem",
              }}>
              <TbPlus style={{height: "0.75rem", width: "0.75rem"}} />
              Add
            </button>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {sampleIngredients.map((ingredient) => (
              <div
                key={ingredient}
                style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                <input
                  style={{
                    flex: 1,
                    borderRadius: "0.375rem",
                    border: "1px solid #e5e7eb",
                    paddingInline: "0.75rem",
                    paddingBlock: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                  defaultValue={ingredient}
                  readOnly
                />
                <button style={{borderRadius: "0.25rem", padding: "0.25rem"}}>
                  <TbX style={{height: "1rem", width: "1rem", color: "#9ca3af"}} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Difficulty</label>
          <div
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}>
            Easy
          </div>
        </div>

        {/* Instructions */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <label style={{fontSize: "0.875rem", fontWeight: 500}}>Instructions</label>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingInline: "0.5rem",
                paddingBlock: "0.25rem",
                fontSize: "0.75rem",
              }}>
              <TbWand style={{height: "0.75rem", width: "0.75rem"}} />
              Enhance
            </button>
          </div>
          <textarea
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            rows={4}
            defaultValue={
              "1. Preheat oven to 200°C.\n2. Season chicken with salt, pepper, and rosemary.\n3. Heat olive oil, sear chicken 3 min per side.\n4. Transfer to oven, roast 25 min until golden."
            }
            readOnly
          />
        </div>

        {/* Prep & Cook Time */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem"}}>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            <label style={{fontSize: "0.875rem", fontWeight: 500}}>Prep Time</label>
            <div style={{display: "flex", alignItems: "center"}}>
              <TbClock style={{marginRight: "0.5rem", height: "1rem", width: "1rem", color: "#9ca3af"}} />
              <input
                style={{
                  width: "100%",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  paddingInline: "0.75rem",
                  paddingBlock: "0.5rem",
                  fontSize: "0.875rem",
                }}
                defaultValue='15 min'
                readOnly
              />
            </div>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            <label style={{fontSize: "0.875rem", fontWeight: 500}}>Cook Time</label>
            <div style={{display: "flex", alignItems: "center"}}>
              <TbToolsKitchen style={{marginRight: "0.5rem", height: "1rem", width: "1rem", color: "#9ca3af"}} />
              <input
                style={{
                  width: "100%",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  paddingInline: "0.75rem",
                  paddingBlock: "0.5rem",
                  fontSize: "0.875rem",
                }}
                defaultValue='25 min'
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          Cancel
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#111827",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbDisc style={{height: "1rem", width: "1rem"}} />
          Create Recipe
        </button>
      </div>
    </div>
  ),
};

/** Static preview of a read-only recipe view. */
export const ViewRecipe: Story = {
  render: () => (
    <div
      style={{
        width: "100%",
        maxWidth: "32rem",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Herb-Roasted Chicken</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
          A simple and delicious herb-roasted chicken with garlic and rosemary.
        </p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        {/* Meta badges */}
        <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem"}}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              borderRadius: "9999px",
              backgroundColor: "#dcfce7",
              paddingInline: "0.625rem",
              paddingBlock: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#15803d",
            }}>
            Easy
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              borderRadius: "9999px",
              backgroundColor: "#dbeafe",
              paddingInline: "0.625rem",
              paddingBlock: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#1d4ed8",
            }}>
            <TbClock style={{height: "0.75rem", width: "0.75rem"}} />
            15 min prep
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              borderRadius: "9999px",
              backgroundColor: "#ffedd5",
              paddingInline: "0.625rem",
              paddingBlock: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#c2410c",
            }}>
            <TbToolsKitchen style={{height: "0.75rem", width: "0.75rem"}} />
            25 min cook
          </span>
        </div>

        {/* Ingredients */}
        <div>
          <h3 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Ingredients</h3>
          <ul
            style={{
              listStyleType: "disc",
              paddingLeft: "1.25rem",
              fontSize: "0.875rem",
              color: "#4b5563",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}>
            {sampleIngredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h3 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Instructions</h3>
          <ol
            style={{
              listStyleType: "decimal",
              paddingLeft: "1.25rem",
              fontSize: "0.875rem",
              color: "#4b5563",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}>
            <li>Preheat oven to 200°C.</li>
            <li>Season chicken with salt, pepper, and rosemary.</li>
            <li>Heat olive oil, sear chicken 3 min per side.</li>
            <li>Transfer to oven, roast 25 min until golden.</li>
          </ol>
        </div>
      </div>
    </div>
  ),
};
