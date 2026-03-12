import type {Meta, StoryObj} from "@storybook/react";
import {TbDiscFilled} from "react-icons/tb";

/**
 * Static visual preview of the MetadataDialog component.
 *
 * The actual component is multi-mode (add/edit/delete) and depends on
 * `useDialog` context, so this story renders a faithful HTML replica
 * of the "Add Metadata" form variant.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MetadataDialog",
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

/** Default "Add Metadata" form. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Add Metadata</h2>
        <p className='mt-1 text-sm text-gray-500'>Add a new key-value metadata pair to this invoice.</p>
      </div>

      <div className='space-y-4 p-6'>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Key</label>
          <input
            className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
            placeholder='e.g., loyaltyPoints'
            readOnly
          />
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Value</label>
          <input
            className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
            placeholder='e.g., 150'
            readOnly
          />
        </div>
      </div>

      {/* Footer */}
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

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
