import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * Because it depends on `useEditInvoiceContext`, this story renders a
 * **static preview** of the card layout with mock invoice data.
 */
const meta = {
  title: "Invoices/EditInvoice/InvoiceCard",
  decorators: [
    (Story) => (
      <div className='max-w-2xl'>
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

/** Static preview of the editable invoice card. */
export const Preview: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='space-y-1 border-b p-6'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>Invoice Details</h3>
          <span className='cursor-pointer rounded-full border px-3 py-1 text-xs'>♡ Mark Important</span>
        </div>
        <p className='text-sm text-gray-500'>From: Mock Merchant • Weekly grocery shopping</p>
      </div>
      <div className='space-y-4 p-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <h4 className='text-xs font-medium text-gray-500'>Date (UTC)</h4>
            <p className='text-sm'>📅 January 15, 2025, 10:30 AM</p>
          </div>
          <div>
            <h4 className='text-xs font-medium text-gray-500'>Category</h4>
            <p className='text-sm'>🏷 GROCERIES</p>
          </div>
          <div>
            <h4 className='text-xs font-medium text-gray-500'>Payment Method</h4>
            <p className='text-sm'>💳 CREDIT CARD</p>
          </div>
          <div>
            <h4 className='text-xs font-medium text-gray-500'>Total Amount</h4>
            <p className='text-lg font-bold text-green-600'>$125.50</p>
          </div>
        </div>
        <hr />
        <div>
          <h4 className='mb-2 text-sm font-semibold'>Items (3)</h4>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-left text-xs text-gray-500'>
                <th className='pb-2'>Item</th>
                <th className='pb-2 text-right'>Qty</th>
                <th className='pb-2 text-right'>Price</th>
                <th className='pb-2 text-right'>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='py-2'>Organic Milk</td>
                <td className='py-2 text-right'>2</td>
                <td className='py-2 text-right'>$3.99</td>
                <td className='py-2 text-right font-medium'>$7.98</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2'>Whole Wheat Bread</td>
                <td className='py-2 text-right'>1</td>
                <td className='py-2 text-right'>$4.50</td>
                <td className='py-2 text-right font-medium'>$4.50</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2'>Fresh Salmon</td>
                <td className='py-2 text-right'>0.5 kg</td>
                <td className='py-2 text-right'>$12.00</td>
                <td className='py-2 text-right font-medium'>$6.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ),
};
