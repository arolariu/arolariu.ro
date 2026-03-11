import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceDetailsCard displays the full invoice summary: date, category,
 * payment method, total, and a paginated items table. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the invoice details card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceDetailsCard",
  decorators: [
    (Story) => (
      <div className='max-w-3xl'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full invoice details preview with items table. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-6'>
        <div className='flex items-center gap-2'>
          <h3 className='text-lg font-semibold'>Invoice Details</h3>
          <span title='Important'>❤️</span>
        </div>
        <p className='text-sm text-gray-500'>Kaufland • Weekly grocery shopping</p>
      </div>
      <div className='space-y-4 p-6'>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>📅 Date (UTC)</p>
            <p className='text-sm'>January 15, 2025, 10:30 AM</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Category</p>
            <span className='rounded-full border px-2 py-0.5 text-xs'>GROCERIES</span>
          </div>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>💳 Payment</p>
            <p className='text-sm'>CREDIT CARD</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Total Amount</p>
            <p className='text-lg font-bold text-green-600'>$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Items (8)</h4>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-xs text-gray-500'>
                <th className='pb-2 text-left'>Item</th>
                <th className='pb-2 text-right'>Qty</th>
                <th className='pb-2 text-right'>Unit</th>
                <th className='pb-2 text-right'>Price</th>
                <th className='pb-2 text-right'>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='py-2'>Organic Milk 2L</td>
                <td className='py-2 text-right'>2</td>
                <td className='py-2 text-right'>pcs</td>
                <td className='py-2 text-right'>$3.99</td>
                <td className='py-2 text-right font-medium'>$7.98</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2'>Fresh Salmon</td>
                <td className='py-2 text-right'>0.5</td>
                <td className='py-2 text-right'>kg</td>
                <td className='py-2 text-right'>$24.99</td>
                <td className='py-2 text-right font-medium'>$12.50</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className='bg-gray-50 font-semibold dark:bg-gray-800'>
                <td
                  className='py-2 pl-2'
                  colSpan={4}>
                  Grand Total
                </td>
                <td className='py-2 pr-2 text-right'>$125.50</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};

/** Invoice with 20+ items to test long lists and scrolling. */
export const ManyItems: Story = {
  render: () => {
    const items = [
      {name: "Organic Milk 2L", qty: "2", unit: "pcs", price: "$3.99", total: "$7.98"},
      {name: "Fresh Salmon", qty: "0.5", unit: "kg", price: "$24.99", total: "$12.50"},
      {name: "Whole Wheat Bread", qty: "1", unit: "pcs", price: "$2.49", total: "$2.49"},
      {name: "Free-Range Eggs (12)", qty: "2", unit: "pcs", price: "$4.99", total: "$9.98"},
      {name: "Avocados", qty: "4", unit: "pcs", price: "$1.50", total: "$6.00"},
      {name: "Greek Yogurt 500g", qty: "3", unit: "pcs", price: "$3.29", total: "$9.87"},
      {name: "Cherry Tomatoes 500g", qty: "2", unit: "pcs", price: "$2.99", total: "$5.98"},
      {name: "Sparkling Water 1.5L", qty: "6", unit: "pcs", price: "$0.89", total: "$5.34"},
      {name: "Olive Oil Extra Virgin", qty: "1", unit: "pcs", price: "$8.99", total: "$8.99"},
      {name: "Parmesan Cheese 200g", qty: "1", unit: "pcs", price: "$6.49", total: "$6.49"},
      {name: "Fresh Basil Bunch", qty: "1", unit: "pcs", price: "$1.99", total: "$1.99"},
      {name: "Chicken Breast 1kg", qty: "1", unit: "kg", price: "$9.99", total: "$9.99"},
      {name: "Brown Rice 1kg", qty: "2", unit: "pcs", price: "$3.49", total: "$6.98"},
      {name: "Almond Butter 250g", qty: "1", unit: "pcs", price: "$7.99", total: "$7.99"},
      {name: "Spinach 200g", qty: "2", unit: "pcs", price: "$2.29", total: "$4.58"},
      {name: "Blueberries 125g", qty: "3", unit: "pcs", price: "$3.99", total: "$11.97"},
      {name: "Granola 500g", qty: "1", unit: "pcs", price: "$5.49", total: "$5.49"},
      {name: "Dark Chocolate 85%", qty: "2", unit: "pcs", price: "$2.99", total: "$5.98"},
      {name: "Orange Juice 1L", qty: "2", unit: "pcs", price: "$3.49", total: "$6.98"},
      {name: "Bananas", qty: "1.2", unit: "kg", price: "$1.99", total: "$2.39"},
      {name: "Cheddar Cheese 300g", qty: "1", unit: "pcs", price: "$4.99", total: "$4.99"},
      {name: "Sourdough Loaf", qty: "1", unit: "pcs", price: "$4.49", total: "$4.49"},
    ];
    return (
      <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
        <div className='border-b p-6'>
          <div className='flex items-center gap-2'>
            <h3 className='text-lg font-semibold'>Invoice Details</h3>
          </div>
          <p className='text-sm text-gray-500'>Mega Image • Large weekly haul</p>
        </div>
        <div className='space-y-4 p-6'>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
            <div>
              <p className='flex items-center gap-1 text-xs text-gray-500'>📅 Date (UTC)</p>
              <p className='text-sm'>February 1, 2025, 2:15 PM</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Category</p>
              <span className='rounded-full border px-2 py-0.5 text-xs'>GROCERIES</span>
            </div>
            <div>
              <p className='flex items-center gap-1 text-xs text-gray-500'>💳 Payment</p>
              <p className='text-sm'>DEBIT CARD</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Total Amount</p>
              <p className='text-lg font-bold text-green-600'>$147.43</p>
            </div>
          </div>
          <hr />
          <div>
            <h4 className='mb-2 text-sm font-semibold'>Items ({items.length})</h4>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-xs text-gray-500'>
                  <th className='pb-2 text-left'>Item</th>
                  <th className='pb-2 text-right'>Qty</th>
                  <th className='pb-2 text-right'>Unit</th>
                  <th className='pb-2 text-right'>Price</th>
                  <th className='pb-2 text-right'>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.name}
                    className='border-b'>
                    <td className='py-2'>{item.name}</td>
                    <td className='py-2 text-right'>{item.qty}</td>
                    <td className='py-2 text-right'>{item.unit}</td>
                    <td className='py-2 text-right'>{item.price}</td>
                    <td className='py-2 text-right font-medium'>{item.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='bg-gray-50 font-semibold dark:bg-gray-800'>
                  <td
                    className='py-2 pl-2'
                    colSpan={4}>
                    Grand Total
                  </td>
                  <td className='py-2 pr-2 text-right'>$147.43</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  },
};

/** Invoice with no items — empty state. */
export const EmptyItems: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-6'>
        <div className='flex items-center gap-2'>
          <h3 className='text-lg font-semibold'>Invoice Details</h3>
        </div>
        <p className='text-sm text-gray-500'>Unknown Merchant • No items detected</p>
      </div>
      <div className='space-y-4 p-6'>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>📅 Date (UTC)</p>
            <p className='text-sm'>January 20, 2025, 3:00 PM</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Category</p>
            <span className='rounded-full border px-2 py-0.5 text-xs'>UNCATEGORIZED</span>
          </div>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>💳 Payment</p>
            <p className='text-sm'>CASH</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Total Amount</p>
            <p className='text-lg font-bold text-green-600'>$0.00</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Items (0)</h4>
          <div className='flex flex-col items-center justify-center py-8 text-center text-gray-400'>
            <p className='text-sm'>No items detected on this invoice.</p>
            <p className='mt-1 text-xs'>Try re-scanning or manually adding items.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Invoice details at mobile viewport width. */
export const MobileViewport: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-6'>
        <div className='flex items-center gap-2'>
          <h3 className='text-lg font-semibold'>Invoice Details</h3>
          <span title='Important'>❤️</span>
        </div>
        <p className='text-sm text-gray-500'>Kaufland • Weekly grocery shopping</p>
      </div>
      <div className='space-y-4 p-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>📅 Date</p>
            <p className='text-sm'>Jan 15, 2025</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Category</p>
            <span className='rounded-full border px-2 py-0.5 text-xs'>GROCERIES</span>
          </div>
          <div>
            <p className='flex items-center gap-1 text-xs text-gray-500'>💳 Payment</p>
            <p className='text-sm'>CREDIT CARD</p>
          </div>
          <div>
            <p className='text-xs text-gray-500'>Total</p>
            <p className='text-lg font-bold text-green-600'>$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Items (2)</h4>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-xs text-gray-500'>
                <th className='pb-2 text-left'>Item</th>
                <th className='pb-2 text-right'>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='py-2'>Organic Milk 2L</td>
                <td className='py-2 text-right font-medium'>$7.98</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2'>Fresh Salmon</td>
                <td className='py-2 text-right font-medium'>$12.50</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ),
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
