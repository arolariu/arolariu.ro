import type {Meta, StoryObj} from "@storybook/react";

/**
 * MetadataTab displays key-value metadata pairs for an invoice with
 * add, edit, and delete capabilities. Depends on `useDialog`.
 *
 * This story renders a static preview of the metadata tab layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Tabs/MetadataTab",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of metadata tab with sample key-value pairs. */
export const WithMetadata: Story = {
  render: () => (
    <div className='rounded-lg border bg-white dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b p-4'>
        <div>
          <h3 className='text-lg font-semibold'>Custom Metadata</h3>
          <p className='text-sm text-gray-500'>Additional key-value pairs for this invoice</p>
        </div>
        <button
          type='button'
          className='rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600'>
          ➕ Add
        </button>
      </div>
      <div className='divide-y'>
        {[
          {key: "store_id", value: "KFL-2024-BUC"},
          {key: "receipt_number", value: "INV-2024-001234"},
          {key: "cashier", value: "Station 3"},
        ].map((item) => (
          <div
            key={item.key}
            className='flex items-center justify-between px-4 py-3'>
            <div>
              <span className='rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800'>{item.key}</span>
              <span className='ml-3 text-sm'>{item.value}</span>
            </div>
            <div className='flex gap-1'>
              <button
                type='button'
                className='rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
                ✏️
              </button>
              <button
                type='button'
                className='rounded p-1 text-gray-400 hover:text-red-500'>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty metadata tab. */
export const Empty: Story = {
  render: () => (
    <div className='rounded-lg border bg-white dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b p-4'>
        <div>
          <h3 className='text-lg font-semibold'>Custom Metadata</h3>
          <p className='text-sm text-gray-500'>No custom metadata has been added yet</p>
        </div>
        <button
          type='button'
          className='rounded-md border px-3 py-1.5 text-sm dark:border-gray-600'>
          ➕ Add
        </button>
      </div>
      <div className='p-8 text-center text-sm text-gray-500'>No metadata entries.</div>
    </div>
  ),
};
