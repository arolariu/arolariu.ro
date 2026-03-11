import type {Meta, StoryObj} from "@storybook/react";
import {TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";

/**
 * Static visual preview of the ExportDialog component.
 *
 * The actual component depends on `useDialog` and `useInvoicesStore`,
 * so this story renders a faithful HTML replica of the export form
 * with format selection and options checkboxes.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ExportDialog",
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

/** Default export dialog with CSV selected. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Export Invoices</h2>
        <p className='mt-1 text-sm text-gray-500'>Export 5 invoices in your preferred format.</p>
      </div>

      <div className='space-y-5 p-6'>
        {/* Format selection */}
        <div>
          <h3 className='mb-2 text-sm font-semibold'>Export Format</h3>
          <div className='space-y-2'>
            {[
              {value: "csv", icon: <TbFileSpreadsheet className='h-4 w-4 text-green-600' />, label: "CSV", selected: true},
              {value: "json", icon: <TbJson className='h-4 w-4 text-blue-600' />, label: "JSON", selected: false},
              {value: "pdf", icon: <TbFileText className='h-4 w-4 text-red-600' />, label: "PDF", selected: false},
            ].map((format) => (
              <label
                key={format.value}
                className='flex items-center gap-3 text-sm'>
                <input
                  type='radio'
                  name='format'
                  checked={format.selected}
                  readOnly
                  className='h-4 w-4'
                />
                <span className='flex items-center gap-2'>
                  {format.icon}
                  {format.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <h3 className='mb-2 text-sm font-semibold'>Include in Export</h3>
          <div className='space-y-2'>
            {[
              {label: "Include Metadata", checked: false},
              {label: "Include Products", checked: true},
              {label: "Include Merchant", checked: false},
              {label: "Include Headers", checked: true},
            ].map((opt) => (
              <label
                key={opt.label}
                className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={opt.checked}
                  readOnly
                  className='h-4 w-4 rounded border'
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDownload className='h-4 w-4' />
          Export
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
