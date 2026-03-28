import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";

faker.seed(42);

/**
 * TableView renders invoices in a sortable, paginated table with
 * checkboxes, category badges, dates, amounts, and row-level actions.
 * Depends on `useInvoicesStore` and `useTranslations`.
 *
 * This story renders a static preview of the table layout since
 * the component depends on Zustand store and complex context.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function generateMockRows(count: number) {
  const categories = ["GROCERY", "FAST_FOOD", "HOME_CLEANING", "CAR_AUTO", "OTHER"];
  return Array.from({length: count}, () => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    category: faker.helpers.arrayElement(categories),
    date: faker.date.recent({days: 90}).toLocaleDateString("en-US"),
    amount: faker.number.float({min: 10, max: 500, fractionDigits: 2}),
  }));
}

/** Preview of the table view with 8 invoice rows. */
export const Preview: Story = {
  render: () => {
    const rows = generateMockRows(8);
    return (
      <div style={{padding: '1.5rem'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280'}}>
              <th style={{padding: '0.75rem'}}>
                <input type='checkbox' />
              </th>
              <th style={{padding: '0.75rem'}}>Invoice</th>
              <th style={{padding: '0.75rem'}}>Category</th>
              <th style={{padding: '0.75rem'}}>Date ↕</th>
              <th style={{padding: '0.75rem'}}>Amount ↕</th>
              <th style={{padding: '0.75rem', textAlign: 'end'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem'}}>
                <td style={{padding: '0.75rem'}}>
                  <input type='checkbox' />
                </td>
                <td style={{padding: '0.75rem', fontWeight: 500}}>{row.name}</td>
                <td style={{padding: '0.75rem'}}>
                  <span style={{borderRadius: '9999px', backgroundColor: '#f3f4f6', padding: '0.125rem 0.5rem', fontSize: '0.75rem'}}>{row.category}</span>
                </td>
                <td style={{padding: '0.75rem', color: '#6b7280'}}>{row.date}</td>
                <td style={{padding: '0.75rem', fontWeight: 500}}>{row.amount.toFixed(2)} RON</td>
                <td style={{padding: '0.75rem', textAlign: 'end'}}>
                  <button
                    type='button'
                    style={{color: '#9ca3af'}}>
                    👁 ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop: '1px solid #e5e7eb'}}>
              <td
                colSpan={4}
                style={{padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280'}}>
                Rows per page: 10 | Page 1 of 1
              </td>
              <td
                colSpan={2}
                style={{padding: '0.75rem', textAlign: 'end'}}>
                <button
                  type='button'
                  style={{borderRadius: '0.25rem', border: '1px solid #e5e7eb', padding: '0.25rem 0.75rem', fontSize: '0.75rem'}}>
                  Previous
                </button>
                <button
                  type='button'
                  style={{marginLeft: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb', padding: '0.25rem 0.75rem', fontSize: '0.75rem'}}>
                  Next
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  },
};

/** Empty state — no invoices. */
export const EmptyState: Story = {
  render: () => (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem'}}>
      <div style={{textAlign: 'center', color: '#6b7280'}}>
        <p style={{fontSize: '1.125rem'}}>No invoices found</p>
      </div>
    </div>
  ),
};
