import type {Meta, StoryObj} from "@storybook/react";
import {TbCloudUpload, TbUpload} from "react-icons/tb";

/**
 * Static visual preview of the AddScanDialog component.
 *
 * The actual component depends on `useDialog` context, react-dropzone,
 * and server actions for uploading to Azure Blob Storage, so this story
 * renders a faithful HTML replica of the upload dialog with dropzone.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AddScanDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-md p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default upload dialog with empty dropzone. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Add Scan</h2>
        <p className='mt-1 text-sm text-gray-500'>Upload a new receipt scan to this invoice.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Dropzone */}
        <div className='flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-purple-400 hover:bg-purple-50/30 dark:border-gray-600 dark:hover:border-purple-600 dark:hover:bg-purple-900/10'>
          <TbCloudUpload className='h-10 w-10 text-gray-400' />
          <p className='mt-2 text-sm font-medium text-gray-600 dark:text-gray-400'>Drag & drop your file here</p>
          <p className='text-xs text-gray-500'>or click to browse</p>
          <p className='mt-2 text-xs text-gray-400'>Supports: JPEG, PNG, PDF (max 10MB)</p>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button
          className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white opacity-50 dark:bg-gray-100 dark:text-gray-900'
          disabled>
          <TbUpload className='h-4 w-4' />
          Upload
        </button>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
