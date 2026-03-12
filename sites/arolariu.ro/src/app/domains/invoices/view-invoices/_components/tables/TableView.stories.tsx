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
  component: undefined as never,
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
      <div className='p-6'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='border-b text-left text-sm font-medium text-gray-500 dark:border-gray-700'>
              <th className='px-3 py-3'>
                <input type='checkbox' />
              </th>
              <th className='px-3 py-3'>Invoice</th>
              <th className='px-3 py-3'>Category</th>
              <th className='px-3 py-3'>Date ↕</th>
              <th className='px-3 py-3'>Amount ↕</th>
              <th className='px-3 py-3 text-end'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className='border-b text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'>
                <td className='px-3 py-3'>
                  <input type='checkbox' />
                </td>
                <td className='px-3 py-3 font-medium'>{row.name}</td>
                <td className='px-3 py-3'>
                  <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800'>{row.category}</span>
                </td>
                <td className='px-3 py-3 text-gray-500'>{row.date}</td>
                <td className='px-3 py-3 font-medium'>{row.amount.toFixed(2)} RON</td>
                <td className='px-3 py-3 text-end'>
                  <button
                    type='button'
                    className='text-gray-400 hover:text-gray-600'>
                    👁 ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className='border-t dark:border-gray-700'>
              <td
                colSpan={4}
                className='px-3 py-3 text-sm text-gray-500'>
                Rows per page: 10 | Page 1 of 1
              </td>
              <td
                colSpan={2}
                className='px-3 py-3 text-end'>
                <button
                  type='button'
                  className='rounded border px-3 py-1 text-xs dark:border-gray-700'>
                  Previous
                </button>
                <button
                  type='button'
                  className='ml-2 rounded border px-3 py-1 text-xs dark:border-gray-700'>
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
    <div className='flex items-center justify-center p-12'>
      <div className='text-center text-gray-500'>
        <p className='text-lg'>No invoices found</p>
      </div>
    </div>
  ),
};
