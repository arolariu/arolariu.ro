import type {Meta, StoryObj} from "@storybook/react";
import {TbFile, TbUpload} from "react-icons/tb";

/**
 * Static visual preview of the ImportDialog component.
 *
 * The actual component depends on `useDialog` and `react-dropzone`,
 * so this story renders a faithful HTML replica of the import form
 * with tab selection, dropzone area, and file list.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ImportDialog",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default import dialog with empty dropzone. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Import Invoices</h2>
        <p className='mt-1 text-sm text-gray-500'>Upload invoice files to import data.</p>
      </div>

      <div className='p-6'>
        {/* Tab bar */}
        <div className='mb-4 grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
          <button className='rounded-md bg-white py-1.5 text-sm font-medium shadow-sm dark:bg-gray-700'>CSV</button>
          <button className='py-1.5 text-sm text-gray-500'>PDF</button>
          <button className='py-1.5 text-sm text-gray-500'>XLSX</button>
        </div>

        {/* Dropzone */}
        <div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800'>
          <div className='rounded-full bg-blue-100 p-3 dark:bg-blue-900/50'>
            <TbUpload className='h-6 w-6 text-blue-600' />
          </div>
          <h3 className='mt-3 text-sm font-medium'>Drag and drop files here</h3>
          <p className='mt-1 text-xs text-gray-500'>or click to browse</p>
          <p className='mt-2 text-xs text-gray-400'>Accepts .csv files up to 10MB</p>
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button
          className='rounded-md bg-gray-300 px-4 py-2 text-sm text-gray-500'
          disabled>
          Import
        </button>
      </div>
    </div>
  ),
};

/** With files selected. */
export const WithFiles: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Import Invoices</h2>
        <p className='mt-1 text-sm text-gray-500'>Upload invoice files to import data.</p>
      </div>

      <div className='p-6'>
        <div className='mb-4 grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
          <button className='rounded-md bg-white py-1.5 text-sm font-medium shadow-sm dark:bg-gray-700'>CSV</button>
          <button className='py-1.5 text-sm text-gray-500'>PDF</button>
          <button className='py-1.5 text-sm text-gray-500'>XLSX</button>
        </div>

        <div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-6 dark:border-gray-600 dark:bg-gray-800'>
          <TbUpload className='h-6 w-6 text-blue-600' />
          <p className='mt-2 text-xs text-gray-500'>Drop more files or click to browse</p>
        </div>

        {/* File list */}
        <div className='mt-4'>
          <h4 className='mb-2 text-sm font-medium'>Selected Files</h4>
          <div className='space-y-2'>
            {["invoices-jan-2025.csv", "invoices-feb-2025.csv"].map((name) => (
              <div
                key={name}
                className='flex items-center justify-between rounded-md border px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <TbFile className='h-4 w-4 text-blue-500' />
                  <span className='text-sm'>{name}</span>
                </div>
                <button className='text-xs text-gray-500 hover:text-red-500'>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>Import 2 files</button>
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
