import type {Meta, StoryObj} from "@storybook/react";

/**
 * ImageCard displays receipt images with navigation, zoom, and add/remove controls.
 *
 * Because it depends on `useDialog` from DialogContext, this story renders
 * a **static preview** of the card layout and image gallery structure.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/ImageCard",
  decorators: [
    (Story) => (
      <div className='max-w-sm'>
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

/** Static preview of the image card with a placeholder receipt image. */
export const Preview: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b p-4'>
        <h3 className='text-lg font-semibold'>Receipt Scan</h3>
      </div>
      <div className='flex justify-center p-4'>
        <div className='relative h-[300px] w-[200px] overflow-hidden rounded-md border bg-gray-100 dark:bg-gray-800'>
          <div className='flex h-full w-full items-center justify-center text-sm text-gray-400'>📷 Receipt Image</div>
        </div>
      </div>
      <div className='flex flex-col gap-2 border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          🔍 Expand
        </button>
        <div className='flex gap-2'>
          <button
            type='button'
            className='flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600'>
            ➕ Add Scan
          </button>
          <button
            type='button'
            className='flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-red-500 dark:border-gray-600'>
            🗑 Remove
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Multiple scans with navigation indicators. */
export const MultipleScans: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b p-4'>
        <h3 className='text-lg font-semibold'>Receipt Scan (2/3)</h3>
      </div>
      <div className='flex justify-center p-4'>
        <div className='relative h-[300px] w-[200px] overflow-hidden rounded-md border bg-gray-100 dark:bg-gray-800'>
          <div className='flex h-full w-full items-center justify-center text-sm text-gray-400'>📷 Scan 2 of 3</div>
        </div>
      </div>
      <div className='flex flex-col gap-2 border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600'>
          🔍 Expand
        </button>
        <div className='flex gap-2'>
          <button
            type='button'
            className='flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600'>
            ← Previous
          </button>
          <button
            type='button'
            className='flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600'>
            Next →
          </button>
        </div>
      </div>
    </div>
  ),
};
