import type {Meta, StoryObj} from "@storybook/react";
import {TbDiscFilled} from "react-icons/tb";

/**
 * Static visual preview of the MetadataDialog component.
 *
 * @remarks Static preview — the real component uses `useDialog` context and
 * renders nothing when the dialog is closed. This story renders a faithful
 * HTML replica of the metadata editing form with sample key-value fields.
 *
 * @see {@link MetadataDialog} for the real component implementation
 * @see {@link VALID_METADATA_KEYS} for the predefined metadata key definitions
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MetadataDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMetadata = [
  {key: "loyaltyPoints", label: "Loyalty Points", value: "1250", readonly: false},
  {key: "storeLocation", label: "Store Location", value: "Str. Victoriei 12, Bucharest", readonly: false},
  {key: "cashier", label: "Cashier", value: "Maria P.", readonly: false},
  {key: "receiptNumber", label: "Receipt Number", value: "RCP-2024-00847", readonly: true},
  {key: "transactionId", label: "Transaction ID", value: "TXN-9f3a2b1c", readonly: true},
  {key: "paymentMethod", label: "Payment Method", value: "Credit Card", readonly: false},
];

/** Static preview of the add-metadata dialog form. */
export const AddMetadata: Story = {
  render: () => (
    <div className='w-full max-w-md rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Add Metadata</h2>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>Add a new key-value metadata entry to this invoice.</p>
      </div>

      <div className='space-y-4 p-6'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Key</label>
          <input
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            placeholder='e.g. loyaltyPoints, discountCode'
            defaultValue=''
            readOnly
          />
        </div>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Value</label>
          <input
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            placeholder='Enter metadata value...'
            defaultValue=''
            readOnly
          />
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDiscFilled className='h-4 w-4' />
          Save
        </button>
      </div>
    </div>
  ),
};

/** Static preview of the edit-metadata dialog with pre-filled values. */
export const EditMetadata: Story = {
  render: () => (
    <div className='w-full max-w-md rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Edit Metadata</h2>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>Modify the value for this metadata entry.</p>
      </div>

      <div className='space-y-4 p-6'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Key</label>
          <input
            className='w-full rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800'
            value='paymentMethod'
            disabled
          />
        </div>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Value</label>
          <input
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            defaultValue='Credit Card'
            readOnly
          />
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDiscFilled className='h-4 w-4' />
          Save
        </button>
      </div>
    </div>
  ),
};

/** Static preview showing all valid metadata keys with their current values. */
export const MetadataOverview: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Invoice Metadata</h2>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>All metadata entries attached to this invoice.</p>
      </div>

      <div className='divide-y dark:divide-gray-700'>
        {sampleMetadata.map((entry) => (
          <div
            key={entry.key}
            className='flex items-center justify-between px-6 py-3'>
            <div>
              <p className='text-sm font-medium'>{entry.label}</p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>{entry.key}</p>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm'>{entry.value}</span>
              {entry.readonly && (
                <span className='rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400'>
                  read-only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};
