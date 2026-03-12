import type {Meta, StoryObj} from "@storybook/react";

/**
 * UploadArea provides a drag-and-drop area for uploading receipt scans.
 * Depends on `useScanUpload` context.
 *
 * This story renders static previews of the empty and compact upload area states.
 */
const meta = {
  title: "Invoices/UploadScans/UploadArea",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state — no files selected yet. */
export const EmptyState: Story = {
  render: () => (
    <div className='flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center transition-colors hover:border-blue-400 dark:border-gray-600'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
        <span className='text-2xl'>📤</span>
      </div>
      <h3 className='text-xl font-semibold'>Upload Receipt Scans</h3>
      <p className='text-sm text-gray-500 dark:text-gray-400'>Drag &amp; drop your files here, or click to browse</p>
      <p className='text-xs text-gray-400'>Supported: JPG, PNG, PDF • Max 10MB per file</p>
      <p className='text-xs text-gray-400'>Files are uploaded to secure Azure storage</p>
      <span className='rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-3 text-lg text-white shadow-lg'>Choose Files</span>
    </div>
  ),
};

/** Drag active state. */
export const DragActive: Story = {
  render: () => (
    <div className='flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50 p-12 text-center dark:bg-blue-900/10'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800'>
        <span className='text-2xl'>📤</span>
      </div>
      <h3 className='text-xl font-semibold'>Upload Receipt Scans</h3>
      <p className='text-sm font-medium text-blue-600'>Drop your files here!</p>
    </div>
  ),
};

/** Compact state — files already added. */
export const CompactWithActions: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-blue-400 dark:border-gray-600'>
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
          <span>📤</span>
        </div>
        <div>
          <p className='text-sm font-medium'>Drag &amp; drop more files, or click to browse</p>
          <p className='text-xs text-gray-400'>JPG, PNG, PDF • Max 10MB</p>
        </div>
      </div>
      <div className='flex justify-end gap-2'>
        <button
          type='button'
          className='rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          Clear All
        </button>
        <button
          type='button'
          className='rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm text-white'>
          Upload Scans
        </button>
      </div>
    </div>
  ),
};
