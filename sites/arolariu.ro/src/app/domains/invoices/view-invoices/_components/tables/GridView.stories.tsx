import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";

faker.seed(42);

/**
 * GridView renders invoices as a responsive card grid with images,
 * titles, dates, amounts, and selection checkboxes.
 * Depends on `useInvoicesStore` and `useTranslations`.
 *
 * This story renders a static preview of the grid layout since the
 * component depends on Zustand store and complex context.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GridView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function generateMockCards(count: number) {
  return Array.from({length: count}, (_, i) => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    date: faker.date.recent({days: 90}).toLocaleDateString("en-US", {dateStyle: "full"}),
    amount: faker.number.float({min: 10, max: 500, fractionDigits: 2}),
    itemCount: faker.number.int({min: 1, max: 20}),
    index: i,
  }));
}

/** Preview of the grid view with 6 invoice cards. */
export const Preview: Story = {
  render: () => {
    const cards = generateMockCards(6);
    return (
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "1.5rem"}}>
        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}>
            <div style={{position: "relative", height: "10rem", background: "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)"}}>
              <div style={{position: "absolute", top: "0.5rem", left: "0.5rem"}}>
                <input
                  type='checkbox'
                  style={{borderRadius: "0.25rem"}}
                />
              </div>
              <div style={{display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: "2.25rem"}}>🧾</div>
            </div>
            <div style={{padding: "1rem"}}>
              <h4 style={{fontWeight: 600}}>{card.name}</h4>
              <p style={{fontSize: "0.875rem", color: "#6b7280"}}>{card.description}</p>
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                }}>
                <span style={{color: "#6b7280"}}>📅 {card.date}</span>
                <span style={{fontWeight: 700}}>{card.amount.toFixed(2)} RON</span>
              </div>
              <div style={{marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af"}}>{card.itemCount} items</div>
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/** Empty state — no invoices available. */
export const EmptyState: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem"}}>
      <div style={{textAlign: "center", color: "#6b7280"}}>
        <p style={{fontSize: "1.125rem"}}>No invoices found</p>
      </div>
    </div>
  ),
};
