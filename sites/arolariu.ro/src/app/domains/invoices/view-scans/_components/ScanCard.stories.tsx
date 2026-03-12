import type {Meta, StoryObj} from "@storybook/react";

/**
 * ScanCard displays an individual scan with preview, selection checkbox,
 * file info, and delete action. Depends on `useScansStore` and `deleteScan`.
 *
 * This story renders a static preview of the scan card.
 */
const meta = {
  title: "Invoices/ViewScans/ScanCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Image scan card with file details. */
export const ImageScan: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm hover:shadow-md dark:bg-gray-900'>
      <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
        <img src='https://picsum.photos/seed/scancard/400/300' alt='receipt.jpg scan' className='h-full w-full object-cover' />
        <div className='absolute top-2 right-2'>
          <input
            type='checkbox'
            className='h-5 w-5'
          />
        </div>
        <div className='absolute top-2 left-2'>
          <button
            type='button'
            className='rounded-full bg-white/80 p-1 text-xs shadow-sm dark:bg-gray-800/80'>
            ⋮
          </button>
        </div>
      </div>
      <div className='p-3'>
        <p className='truncate text-sm font-medium'>grocery-receipt-2025-01.jpg</p>
        <div className='flex justify-between text-xs text-gray-500'>
          <span>1.2 MB</span>
          <span>Jan 15, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** PDF scan card. */
export const PdfScan: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='relative flex aspect-[4/3] items-center justify-center bg-red-50 dark:bg-red-900/20'>
        <span className='text-4xl text-red-400'>📄</span>
        <div className='absolute top-2 right-2'>
          <input
            type='checkbox'
            className='h-5 w-5'
          />
        </div>
      </div>
      <div className='p-3'>
        <p className='truncate text-sm font-medium'>invoice-scan.pdf</p>
        <div className='flex justify-between text-xs text-gray-500'>
          <span>3.4 MB</span>
          <span>Jan 10, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** Selected scan card with ring highlight. */
export const Selected: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm ring-2 ring-purple-500 dark:bg-gray-900'>
      <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
        <img src='https://picsum.photos/seed/scancard2/400/300' alt='selected.jpg scan' className='h-full w-full object-cover' />
        <div className='absolute top-2 right-2'>
          <input
            type='checkbox'
            checked
            readOnly
            className='h-5 w-5 accent-purple-500'
          />
        </div>
      </div>
      <div className='p-3'>
        <p className='truncate text-sm font-medium'>selected-scan.jpg</p>
        <div className='flex justify-between text-xs text-gray-500'>
          <span>800 KB</span>
          <span>Jan 12, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** Scan linked to an invoice. */
export const LinkedToInvoice: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='relative aspect-[4/3] bg-gray-100 dark:bg-gray-800'>
        <img src='https://picsum.photos/seed/scancard3/400/300' alt='linked.jpg scan' className='h-full w-full object-cover' />
        <div className='absolute bottom-2 left-2'>
          <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200'>🔗 Linked</span>
        </div>
      </div>
      <div className='p-3'>
        <p className='truncate text-sm font-medium'>linked-receipt.jpg</p>
        <div className='flex justify-between text-xs text-gray-500'>
          <span>950 KB</span>
          <span>Jan 8, 2025</span>
        </div>
      </div>
    </div>
  ),
};
